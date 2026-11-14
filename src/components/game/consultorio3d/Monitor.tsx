"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { prefiereReducido } from "@/components/three/CiudadRevelacion";
import {
  alturaEcg,
  colocacionMonitor,
  estadoMonitor,
  GIRO_MONITOR_Y,
  INTERVALO_MONITOR_MS,
  lineasMonitor,
  PUNTOS_ECG,
  TEXTO_ANALIZANDO,
  type EstadoMonitor,
  type LineasMonitor,
} from "@/lib/monitor";

const ANCHO = 512;
const ALTO = 320;
const MARGEN = 24;
const ANCHO_ECG = ANCHO - MARGEN * 2;
const BASE_ECG = 150;
const AMPLITUD_ECG = 56;
/** Franja vertical que ocupa el trazo (con holgura para el grosor de la línea). */
const TOPE_ECG = BASE_ECG - AMPLITUD_ECG - 8;
const ALTO_ECG = AMPLITUD_ECG * 1.3 + 16;
/** Hueco sin trazo delante de la cabeza del barrido, como en un monitor real. */
const HUECO_ECG = 36;
const FONDO = "#f4f9f8";
const VERDE_ECG = "#27b26a";

function rectRedondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** Capa fija, una vez por paciente: cabecera, nombre y renglones difuminados (el blur es caro). */
function dibujarFondo(ctx: CanvasRenderingContext2D, lineas: LineasMonitor) {
  ctx.filter = "none";
  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.fillStyle = "#2ec4b6";
  ctx.fillRect(0, 0, ANCHO, 56);
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillText(lineas.encabezado, MARGEN, 29);
  ctx.fillStyle = "#3d3350";
  ctx.font = "500 24px system-ui, sans-serif";
  ctx.fillText(lineas.paciente, MARGEN, 86);

  // Renglones de texto difuminados: se leen como datos, sin revelar nada.
  ctx.filter = "blur(2px)";
  ctx.fillStyle = "#b9c9cf";
  rectRedondeado(ctx, MARGEN, 196, 300, 10, 5);
  rectRedondeado(ctx, MARGEN, 214, 210, 10, 5);
  ctx.filter = "none";
}

/** Trazo del ECG recortado a la franja [desde, hasta] en píxeles. */
function trazarEcg(ctx: CanvasRenderingContext2D, desde: number, hasta: number) {
  if (hasta <= desde) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(desde, TOPE_ECG, hasta - desde, ALTO_ECG);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(MARGEN, BASE_ECG);
  for (const [avance, altura] of PUNTOS_ECG) ctx.lineTo(MARGEN + avance * ANCHO_ECG, BASE_ECG - altura * AMPLITUD_ECG);
  ctx.stroke();
  ctx.restore();
}

/** Capa viva: ECG que barre la pantalla, luz de actividad y análisis o resultado. */
function dibujarCuadro(ctx: CanvasRenderingContext2D, fondo: HTMLCanvasElement, lineas: LineasMonitor, estado: EstadoMonitor) {
  ctx.drawImage(fondo, 0, 0);
  ctx.textBaseline = "middle";

  ctx.strokeStyle = VERDE_ECG;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (estado.barrido === null) {
    trazarEcg(ctx, MARGEN - 4, ANCHO - MARGEN + 4);
  } else {
    const cabeza = MARGEN + estado.barrido * ANCHO_ECG;
    trazarEcg(ctx, MARGEN - 4, cabeza);
    // El trazo de la pasada anterior sigue a la vista por delante del hueco.
    if (estado.vueltas > 0) trazarEcg(ctx, cabeza + HUECO_ECG, ANCHO - MARGEN + 4);
    ctx.fillStyle = VERDE_ECG;
    ctx.beginPath();
    ctx.arc(cabeza, BASE_ECG - alturaEcg(estado.barrido) * AMPLITUD_ECG, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Luz de actividad en la cabecera: parpadea mientras la pantalla está viva.
  if (estado.cursor) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ANCHO - MARGEN - 8, 28, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  if (estado.fase === "analizando") {
    ctx.fillStyle = "#e3edef";
    rectRedondeado(ctx, MARGEN, 236, ANCHO - MARGEN * 2, 62, 14);
    ctx.fillStyle = "#3d3350";
    ctx.font = "600 24px system-ui, sans-serif";
    ctx.fillText(`${TEXTO_ANALIZANDO}…${estado.cursor ? " ▌" : ""}`, 40, 256);
    ctx.fillStyle = "#c5d5d9";
    rectRedondeado(ctx, 40, 276, ANCHO - 80, 10, 5);
    ctx.fillStyle = "#2ec4b6";
    rectRedondeado(ctx, 40, 276, Math.max(10, (ANCHO - 80) * estado.progreso), 10, 5);
    return;
  }
  ctx.fillStyle = "#fbe3e1";
  rectRedondeado(ctx, MARGEN, 236, ANCHO - MARGEN * 2, 62, 14);
  ctx.fillStyle = "#c2383a";
  ctx.font = "700 32px system-ui, sans-serif";
  ctx.fillText(lineas.resultado, 40, 268);
}

/** Halo suave y radial, detrás del marco: da brillo sin lavar la pantalla. */
function crearHalo(): THREE.CanvasTexture {
  const lienzo = document.createElement("canvas");
  lienzo.width = 128;
  lienzo.height = 128;
  const ctx = lienzo.getContext("2d");
  if (ctx) {
    const degradado = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    degradado.addColorStop(0, "rgba(190,255,240,0.55)");
    degradado.addColorStop(0.55, "rgba(190,255,240,0.18)");
    degradado.addColorStop(1, "rgba(190,255,240,0)");
    ctx.fillStyle = degradado;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(lienzo);
}

const COLOR_MARCO = "#3b3150";
const COLOR_SOPORTE = "#cbbcd9";
const COLOR_TECLADO = "#efe7f4";
const COLOR_TECLA = "#b7a7cb";

function crearLienzo(): HTMLCanvasElement {
  const lienzo = document.createElement("canvas");
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  return lienzo;
}

/**
 * Computadora del médico sobre el escritorio: monitor con pantalla emisiva,
 * teclado y ratón. La pantalla se anima con un temporizador propio a ~12 fps
 * (no con el frameloop): cada cuadro pide un render con `invalidate`, así la
 * escena no vuelve a 60 fps mientras el paciente espera sentado. Al cambiar
 * de paciente reinicia el análisis. Con movimiento reducido es estática.
 */
export function Monitor({ nombre }: { nombre?: string }) {
  const invalidar = useThree((s) => s.invalidate);
  const aspecto = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const { posicion, escala } = colocacionMonitor(aspecto);
  const lienzo = useMemo(crearLienzo, []);
  const fondo = useMemo(crearLienzo, []);
  const textura = useMemo(() => {
    const t = new THREE.CanvasTexture(lienzo);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [lienzo]);
  const halo = useMemo(crearHalo, []);

  useEffect(() => {
    const ctx = lienzo.getContext("2d");
    const ctxFondo = fondo.getContext("2d");
    if (!ctx || !ctxFondo) return;
    const lineas = lineasMonitor(nombre);
    dibujarFondo(ctxFondo, lineas);
    const reducido = prefiereReducido();
    const inicio = performance.now();
    const pintar = () => {
      dibujarCuadro(ctx, fondo, lineas, estadoMonitor(performance.now() - inicio, reducido));
      textura.needsUpdate = true;
      invalidar();
    };
    pintar();
    if (reducido) return;
    const id = setInterval(pintar, INTERVALO_MONITOR_MS);
    return () => clearInterval(id);
  }, [lienzo, fondo, textura, nombre, invalidar]);

  useEffect(() => () => {
    textura.dispose();
    halo.dispose();
  }, [textura, halo]);

  const teclas = [0, 1, 2].flatMap((fila) =>
    Array.from({ length: 10 }, (_, i) => ({ fila, i })),
  );

  return (
    <group position={posicion} rotation={[0, GIRO_MONITOR_Y, 0]} scale={escala}>
      {/* Soporte y base finos; el marco redondeado queda sobre ellos. */}
      <RoundedBox args={[0.24, 0.016, 0.17]} radius={0.006} smoothness={3} position={[0, 0.008, 0]}>
        <meshStandardMaterial color={COLOR_SOPORTE} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.05, 0.14, 0.03]} radius={0.012} smoothness={3} position={[0, 0.08, -0.02]}>
        <meshStandardMaterial color={COLOR_SOPORTE} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.6, 0.38, 0.04]} radius={0.03} smoothness={4} position={[0, 0.34, 0]}>
        <meshStandardMaterial color={COLOR_MARCO} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0.34, 0.0215]}>
        <planeGeometry args={[0.52, 0.325]} />
        <meshBasicMaterial map={textura} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.34, -0.03]}>
        <planeGeometry args={[0.8, 0.56]} />
        <meshBasicMaterial map={halo} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Teclado con tres filas de teclas redondeadas y ratón a la derecha. */}
      <RoundedBox args={[0.37, 0.02, 0.15]} radius={0.008} smoothness={3} position={[0, 0.01, 0.2]}>
        <meshStandardMaterial color={COLOR_TECLADO} roughness={0.6} />
      </RoundedBox>
      {teclas.map(({ fila, i }) => (
        <mesh key={`${fila}-${i}`} position={[(i - 4.5) * 0.034, 0.026, 0.2 + (fila - 1) * 0.036]}>
          <boxGeometry args={[0.026, 0.012, 0.026]} />
          <meshStandardMaterial color={COLOR_TECLA} roughness={0.6} />
        </mesh>
      ))}
      <RoundedBox args={[0.07, 0.025, 0.11]} radius={0.012} smoothness={3} position={[0.27, 0.0125, 0.2]}>
        <meshStandardMaterial color={COLOR_TECLADO} roughness={0.6} />
      </RoundedBox>
    </group>
  );
}
