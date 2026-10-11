"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  calcularLayout,
  CENTRO_BLOQUE,
  contarPorGrupo,
  ORDEN_GRUPOS,
  TOTAL_ESFERAS,
  type EsferaLayout,
  type FaseCiudad,
  type Frecuencias,
  type GrupoClave,
} from "@/lib/ciudad-layout";
import { coloresTema } from "@/lib/confeti";
import { Leyenda } from "@/components/game/leyenda";

export type { FaseCiudad };

interface CiudadAnimadaProps {
  frecuencias: Frecuencias;
  fase: FaseCiudad;
  reducido?: boolean;
}

const RADIO_ESFERA = 0.17;
/** Clave de token por grupo (los hex son alternativa si el CSS aún no cargó). */
const TOKEN_POR_GRUPO: Record<GrupoClave, "primary" | "warning" | "info" | "success"> = {
  VP: "primary",
  FP: "warning",
  FN: "info",
  VN: "success",
};

const dummy = new THREE.Object3D();

/** Nube de 1000 esferas en UN solo InstancedMesh. */
function Nube({
  esferas,
  fase,
  reducido,
}: {
  esferas: EsferaLayout[];
  fase: FaseCiudad;
  reducido: boolean;
}) {
  const malla = useRef<THREE.InstancedMesh>(null!);
  const actual = useRef<Float32Array>(new Float32Array(TOTAL_ESFERAS * 3));
  const coloresBase = useRef<THREE.Color[]>([]);

  // Posición inicial: fase ciudad (mezcla).
  useLayoutEffect(() => {
    for (let i = 0; i < TOTAL_ESFERAS; i++) {
      const [x, y, z] = esferas[i].ciudad;
      actual.current[i * 3] = x;
      actual.current[i * 3 + 1] = y;
      actual.current[i * 3 + 2] = z;
    }
    const tema = coloresTema();
    coloresBase.current = esferas.map((e) => new THREE.Color(tema[TOKEN_POR_GRUPO[e.grupo]]));
    for (let i = 0; i < TOTAL_ESFERAS; i++) {
      dummy.position.set(actual.current[i * 3], actual.current[i * 3 + 1], actual.current[i * 3 + 2]);
      dummy.updateMatrix();
      malla.current.setMatrixAt(i, dummy.matrix);
      malla.current.setColorAt(i, coloresBase.current[i]);
    }
    malla.current.instanceMatrix.needsUpdate = true;
    if (malla.current.instanceColor) malla.current.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esferas]);

  // Si hay movimiento reducido: salto directo al objetivo, sin órbita.
  useEffect(() => {
    if (!reducido || !malla.current) return;
    for (let i = 0; i < TOTAL_ESFERAS; i++) {
      const t = fase === "tabla" ? esferas[i].tabla : esferas[i].ciudad;
      actual.current[i * 3] = t[0];
      actual.current[i * 3 + 1] = t[1];
      actual.current[i * 3 + 2] = t[2];
      dummy.position.set(t[0], t[1], t[2]);
      dummy.updateMatrix();
      malla.current.setMatrixAt(i, dummy.matrix);
    }
    malla.current.instanceMatrix.needsUpdate = true;
  }, [fase, reducido, esferas]);

  useFrame((state, dt) => {
    if (!malla.current) return;
    if (!reducido) {
      // Órbita lenta de cámara.
      const t = state.clock.elapsedTime * 0.08;
      state.camera.position.set(Math.sin(t) * 30, 15, Math.cos(t) * 30);
      state.camera.lookAt(0, 0, 0);
      // Interpolación hacia el objetivo.
      const paso = 1 - Math.exp(-Math.min(dt, 0.05) * 2.5);
      const arr = actual.current;
      for (let i = 0; i < TOTAL_ESFERAS; i++) {
        const t3 = fase === "tabla" ? esferas[i].tabla : esferas[i].ciudad;
        const j = i * 3;
        arr[j] += (t3[0] - arr[j]) * paso;
        arr[j + 1] += (t3[1] - arr[j + 1]) * paso;
        arr[j + 2] += (t3[2] - arr[j + 2]) * paso;
        dummy.position.set(arr[j], arr[j + 1], arr[j + 2]);
        dummy.updateMatrix();
        malla.current.setMatrixAt(i, dummy.matrix);
      }
      malla.current.instanceMatrix.needsUpdate = true;
    }
  });

  // Libera geometría/material al desmontar.
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
      <sphereGeometry args={[RADIO_ESFERA, 10, 10]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** Contador por bloque (se lee sin depender del color). */
function Contadores({ conteo }: { conteo: Record<GrupoClave, number> }) {
  return (
    <>
      {ORDEN_GRUPOS.map((g) => (
        <Html key={g} position={CENTRO_BLOQUE[g]} center zIndexRange={[10, 0]}>
          <span className="rounded-full border-2 border-border-strong bg-surface px-3 py-1 text-sm font-bold whitespace-nowrap">
            {g} · {conteo[g]}
          </span>
        </Html>
      ))}
    </>
  );
}

/**
 * Ciudad 3D: 1000 esferas en un InstancedMesh que migran de mezcla
 * a tabla 2x2. Cargar solo con next/dynamic ({ ssr: false }).
 */
export function CiudadAnimada({ frecuencias, fase, reducido = false }: CiudadAnimadaProps) {
  const [visible, setVisible] = useState(true);
  const esferas = useMemo(
    () => calcularLayout(frecuencias),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frecuencias.vp, frecuencias.fp, frecuencias.fn, frecuencias.vn],
  );
  const conteo = useMemo(() => contarPorGrupo(esferas), [esferas]);

  // Pausa el render cuando la pestaña no está visible.
  useEffect(() => {
    const alCambiar = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", alCambiar);
    return () => document.removeEventListener("visibilitychange", alCambiar);
  }, []);

  return (
    <div>
      <div
        role="img"
        aria-label={`Revelación: ${conteo.VP} VP, ${conteo.FP} FP, ${conteo.FN} FN, ${conteo.VN} VN de 1000 personas`}
        className="h-72 w-full overflow-hidden rounded-lg border-2 border-border bg-background sm:h-96"
      >
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 15, 32], fov: 50 }}
          frameloop={visible ? "always" : "never"}
          gl={{ antialias: true }}
        >
          <Nube esferas={esferas} fase={fase} reducido={reducido} />
          {fase === "tabla" ? <Contadores conteo={conteo} /> : null}
        </Canvas>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ORDEN_GRUPOS.map((g) => (
          <Leyenda key={g} grupo={g} cantidad={conteo[g]} />
        ))}
      </div>
    </div>
  );
}
