"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  calcularLayout,
  TOTAL_ESFERAS,
  type EsferaLayout,
  type GrupoClave,
} from "@/lib/ciudad-layout";
import { coloresTema } from "@/lib/confeti";
import { prefiereReducido } from "./CiudadRevelacion";

const dummy = new THREE.Object3D();

/** Grupos que prenden la alerta (dieron positivo en la prueba). */
const POSITIVOS: readonly GrupoClave[] = ["VP", "FP"] as const;

/** Reparto decorativo fijo: el fondo no calcula estadística real. */
const REPARTO_FONDO = { vp: 90, fp: 180, fn: 10, vn: 720 };

/** Giro lento del conjunto (rad/s) y deriva vertical de cada esfera. */
const VELOCIDAD_GIRO = 0.035;
const AMPLITUD_FLOTE = 0.35;
const PASO_FLOTE = 1 / 30;

function Fondo({ esferas, pulso }: { esferas: EsferaLayout[]; pulso: number }) {
  const malla = useRef<THREE.InstancedMesh>(null!);
  const destello = useRef(0);
  const aplicado = useRef(-1);
  const base = useRef<THREE.Color[]>([]);
  const color = useRef(new THREE.Color());
  const rojo = useRef(new THREE.Color("#dc2626"));
  const primero = useRef(true);
  const reducido = useRef(false);
  const tiempo = useRef(0);
  const acumulado = useRef(0);
  // Fase y ritmo propios de cada esfera, para que la deriva no sea sincrónica.
  const fases = useMemo(() => {
    const a = new Float32Array(TOTAL_ESFERAS * 2);
    for (let i = 0; i < TOTAL_ESFERAS; i++) {
      a[i * 2] = Math.random() * Math.PI * 2;
      a[i * 2 + 1] = 0.25 + Math.random() * 0.35;
    }
    return a;
  }, []);

  useEffect(() => {
    reducido.current = prefiereReducido();
  }, []);

  // Colores base tenues desde los tokens del tema.
  useEffect(() => {
    const tema = coloresTema();
    const porGrupo: Record<GrupoClave, THREE.Color> = {
      VP: new THREE.Color(tema.primary).multiplyScalar(0.5),
      FP: new THREE.Color(tema.warning).multiplyScalar(0.5),
      FN: new THREE.Color(tema.info).multiplyScalar(0.5),
      VN: new THREE.Color(tema.success).multiplyScalar(0.5),
    };
    rojo.current = new THREE.Color(tema.primary);
    base.current = esferas.map((e) => porGrupo[e.grupo]);
    for (let i = 0; i < TOTAL_ESFERAS; i++) {
      const [x, y, z] = esferas[i].ciudad;
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      malla.current.setMatrixAt(i, dummy.matrix);
      malla.current.setColorAt(i, base.current[i]);
    }
    malla.current.instanceMatrix.needsUpdate = true;
    if (malla.current.instanceColor) malla.current.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esferas]);

  // Cada partida nueva (pulso++) enciende los positivos un momento.
  useEffect(() => {
    if (primero.current) {
      primero.current = false;
      return;
    }
    destello.current = 1;
  }, [pulso]);

  useFrame((_, dt) => {
    if (!malla.current || base.current.length === 0) return;
    if (!reducido.current) {
      malla.current.rotation.y += dt * VELOCIDAD_GIRO;
      tiempo.current += dt;
      acumulado.current += dt;
      if (acumulado.current >= PASO_FLOTE) {
        acumulado.current = 0;
        const t = tiempo.current;
        for (let i = 0; i < TOTAL_ESFERAS; i++) {
          const [x, y, z] = esferas[i].ciudad;
          dummy.position.set(x, y + Math.sin(t * fases[i * 2 + 1] + fases[i * 2]) * AMPLITUD_FLOTE, z);
          dummy.updateMatrix();
          malla.current.setMatrixAt(i, dummy.matrix);
        }
        malla.current.instanceMatrix.needsUpdate = true;
      }
    }
    if (destello.current > 0) destello.current = Math.max(0, destello.current - dt * 0.8);
    if (Math.abs(destello.current - aplicado.current) < 0.01) return;
    aplicado.current = destello.current;
    const f = destello.current;
    for (let i = 0; i < TOTAL_ESFERAS; i++) {
      if (POSITIVOS.includes(esferas[i].grupo)) {
        malla.current.setColorAt(i, color.current.copy(base.current[i]).lerp(rojo.current, f));
      }
    }
    if (malla.current.instanceColor) malla.current.instanceColor.needsUpdate = true;
  });

  useEffect(() => {
    const inst = malla.current;
    return () => {
      inst?.geometry.dispose();
      const mat = inst?.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    };
  }, []);

  return (
    <instancedMesh ref={malla} args={[undefined, undefined, TOTAL_ESFERAS]} frustumCulled={false}>
      <sphereGeometry args={[0.2, 8, 8]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.85} />
    </instancedMesh>
  );
}

/**
 * Fondo animado del panel: mezcla tenue de 1000 esferas.
 * `pulso` sube con cada partida recibida y enciende los positivos.
 */
export function CiudadFondoPanel({ pulso }: { pulso: number }) {
  const [visible, setVisible] = useState(true);
  const esferas = useMemo(() => calcularLayout(REPARTO_FONDO), []);

  useEffect(() => {
    const alCambiar = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", alCambiar);
    return () => document.removeEventListener("visibilitychange", alCambiar);
  }, []);

  return (
    <div
      aria-hidden="true"
      // R3F pone pointer-events:auto en su contenedor: se anula en todo el subárbol.
      className="pointer-events-none absolute inset-0 overflow-hidden [&_*]:pointer-events-none!"
    >
      <Canvas
        dpr={[1, 1.25]}
        camera={{ position: [0, 14, 34], fov: 50 }}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: false }}
      >
        <Fondo esferas={esferas} pulso={pulso} />
      </Canvas>
    </div>
  );
}
