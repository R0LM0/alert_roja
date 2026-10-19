"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { GIRO_MONITOR_Y, lineasMonitor, type LineasMonitor, POS_MONITOR } from "@/lib/monitor";

const ANCHO = 512;
const ALTO = 320;
const LATIDOS = 3;
/** Un latido del ECG en coordenadas normalizadas [x 0..1, y -1..1]. */
const TRAZO_ECG: [number, number][] = [
  [0, 0], [0.2, 0], [0.25, 0.15], [0.3, -0.12], [0.36, 1], [0.42, -0.3],
  [0.47, 0], [0.6, 0], [0.68, 0.22], [0.74, 0], [1, 0],
];

function rectRedondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** Dibuja la pantalla una vez por paciente: cabecera, paciente, ECG, texto difuminado y resultado. */
function dibujarPantalla(ctx: CanvasRenderingContext2D, lineas: LineasMonitor) {
  ctx.filter = "none";
  ctx.fillStyle = "#f4f9f8";
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.fillStyle = "#2ec4b6";
  ctx.fillRect(0, 0, ANCHO, 56);
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillText(lineas.encabezado, 24, 29);
  ctx.fillStyle = "#3d3350";
  ctx.font = "500 24px system-ui, sans-serif";
  ctx.fillText(lineas.paciente, 24, 86);

  const base = 150;
  const amplitud = 56;
  ctx.strokeStyle = "#27b26a";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(24, base);
  for (let latido = 0; latido < LATIDOS; latido++) {
    const x0 = 24 + latido * 156;
    for (const [dx, dy] of TRAZO_ECG) ctx.lineTo(x0 + dx * 150, base - dy * amplitud);
  }
  ctx.lineTo(ANCHO - 24, base);
  ctx.stroke();

  // Renglones de texto difuminados: se leen como datos, sin revelar nada.
  ctx.filter = "blur(2px)";
  ctx.fillStyle = "#b9c9cf";
  rectRedondeado(ctx, 24, 196, 300, 10, 5);
  rectRedondeado(ctx, 24, 214, 210, 10, 5);
  ctx.filter = "none";

  ctx.fillStyle = "#fbe3e1";
  rectRedondeado(ctx, 24, 236, ANCHO - 48, 62, 14);
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

/**
 * Computadora del médico sobre el escritorio: monitor con pantalla emisiva,
 * teclado y ratón. Todo estático (sin animación): no depende del reloj del
 * frameloop. Solo la textura cambia, y únicamente cuando cambia el paciente.
 */
export function Monitor({ nombre }: { nombre?: string }) {
  const invalidar = useThree((s) => s.invalidate);
  const lienzo = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = ANCHO;
    c.height = ALTO;
    return c;
  }, []);
  const textura = useMemo(() => {
    const t = new THREE.CanvasTexture(lienzo);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [lienzo]);
  const halo = useMemo(crearHalo, []);

  useEffect(() => {
    const ctx = lienzo.getContext("2d");
    if (!ctx) return;
    dibujarPantalla(ctx, lineasMonitor(nombre));
    textura.needsUpdate = true;
    invalidar();
  }, [lienzo, textura, nombre, invalidar]);

  useEffect(() => () => {
    textura.dispose();
    halo.dispose();
  }, [textura, halo]);

  const teclas = [0, 1, 2].flatMap((fila) =>
    Array.from({ length: 10 }, (_, i) => ({ fila, i })),
  );

  return (
    <group position={POS_MONITOR} rotation={[0, GIRO_MONITOR_Y, 0]}>
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
