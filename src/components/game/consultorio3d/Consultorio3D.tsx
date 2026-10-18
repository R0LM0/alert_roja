"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Consultorio } from "@/components/game/consultorio/Consultorio";
import { prefiereReducido } from "@/components/three/CiudadRevelacion";
import {
  anguloPuerta,
  ANGULO_PUERTA_ABIERTA,
  DURACION_PUERTA_MS,
  RETRASO_PUERTA_MS,
  webglDisponible,
} from "@/lib/consultorio3d";
import { duracionEnsamblado } from "@/lib/consultorio-layout";

function CamaraPrimeraPersona() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 1.7, 2.4);
    camera.lookAt(0, 1.1, -4);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function Puerta({ alAbrirse }: { alAbrirse: () => void }) {
  const bisagra = useRef<THREE.Group>(null);
  const inicio = useRef<number | null>(null);
  const terminada = useRef(false);

  useEffect(() => {
    if (prefiereReducido()) {
      if (bisagra.current) bisagra.current.rotation.y = anguloPuerta(RETRASO_PUERTA_MS + DURACION_PUERTA_MS);
      terminada.current = true;
      alAbrirse();
    }
  }, [alAbrirse]);

  useFrame(({ clock }) => {
    if (terminada.current || !bisagra.current) return;
    if (inicio.current === null) inicio.current = clock.elapsedTime;
    const transcurridoMs = (clock.elapsedTime - inicio.current) * 1000;
    bisagra.current.rotation.y = anguloPuerta(transcurridoMs);
    if (anguloPuerta(transcurridoMs) === ANGULO_PUERTA_ABIERTA) {
      terminada.current = true;
      alAbrirse();
    }
  });

  // El borde izquierdo coincide con el marco; el panel se extiende a la derecha.
  return (
    <group ref={bisagra} position={[-0.7, 0, -3.95]}>
      <mesh position={[0.7, 1.3, 0]}>
        <boxGeometry args={[1.4, 2.6, 0.04]} />
        <meshLambertMaterial color="#2ec4b6" />
      </mesh>
    </group>
  );
}

function Habitacion({ alAbrirse }: { alAbrirse: () => void }) {
  return (
    <>
      <CamaraPrimeraPersona />
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 4, 3]} intensity={0.5} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshLambertMaterial color="#e09543" side={THREE.DoubleSide} />
      </mesh>

      {/* Marco de la puerta: hueco de 1.4 x 2.6 en la pared de 3 m. */}
      <mesh position={[-2.85, 1.5, -4]}>
        <boxGeometry args={[4.3, 3, 0.1]} />
        <meshLambertMaterial color="#fff3d6" />
      </mesh>
      <mesh position={[2.85, 1.5, -4]}>
        <boxGeometry args={[4.3, 3, 0.1]} />
        <meshLambertMaterial color="#fff3d6" />
      </mesh>
      <mesh position={[0, 2.8, -4]}>
        <boxGeometry args={[1.4, 0.4, 0.1]} />
        <meshLambertMaterial color="#fff3d6" />
      </mesh>
      <mesh position={[-5, 1.5, 0]}>
        <boxGeometry args={[0.1, 3, 10]} />
        <meshLambertMaterial color="#fff3d6" />
      </mesh>
      <mesh position={[5, 1.5, 0]}>
        <boxGeometry args={[0.1, 3, 10]} />
        <meshLambertMaterial color="#fff3d6" />
      </mesh>
      <mesh position={[0, 1.3, -4.2]}>
        <planeGeometry args={[1.4, 2.6]} />
        <meshBasicMaterial color="#1a1626" />
      </mesh>
      <Puerta alAbrirse={alAbrirse} />

      {/* Escritorio visto desde la silla del doctor: banda inferior del encuadre. */}
      <mesh position={[0, 0.72, 1.2]}>
        <boxGeometry args={[2.2, 0.08, 0.8]} />
        <meshLambertMaterial color="#7c5cbf" />
      </mesh>
      <mesh position={[0, 0.34, 0.84]}>
        <boxGeometry args={[2.05, 0.6, 0.08]} />
        <meshLambertMaterial color="#7c5cbf" />
      </mesh>

      {/* Cruz del cartel, a la izquierda de la puerta; lámina a la derecha. */}
      <mesh position={[-1.15, 1.9, -3.94]}>
        <boxGeometry args={[0.75, 0.75, 0.04]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-1.15, 1.9, -3.9]}>
        <boxGeometry args={[0.12, 0.48, 0.04]} />
        <meshLambertMaterial color="#e63946" />
      </mesh>
      <mesh position={[-1.15, 1.9, -3.9]}>
        <boxGeometry args={[0.48, 0.12, 0.04]} />
        <meshLambertMaterial color="#e63946" />
      </mesh>
      <mesh position={[1.5, 1.85, -3.94]}>
        <boxGeometry args={[0.5, 0.65, 0.04]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      <mesh position={[1.5, 1.85, -3.9]}>
        <boxGeometry args={[0.34, 0.42, 0.04]} />
        <meshLambertMaterial color="#2ec4b6" />
      </mesh>
    </>
  );
}

/** Decorado de consultorio en primera persona; vuelve al SVG si falta WebGL. */
export default function Consultorio3D({ alAbrirPuerta }: { alAbrirPuerta?: () => void }) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(true);
  const [puertaAbierta, setPuertaAbierta] = useState(false);
  const alAbrirse = useCallback(() => setPuertaAbierta(true), []);
  const notificado = useRef(false);

  useEffect(() => {
    setWebgl(webglDisponible());
    const alCambiarVisibilidad = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => document.removeEventListener("visibilitychange", alCambiarVisibilidad);
  }, []);

  // La primera tarjeta aparece cuando la puerta terminó de abrirse (S3).
  useEffect(() => {
    if (puertaAbierta && !notificado.current) {
      notificado.current = true;
      alAbrirPuerta?.();
    }
  }, [puertaAbierta, alAbrirPuerta]);

  // Respaldo medido desde el montaje del canvas (no desde el inicio del turno,
  // que puede ser anterior si el chunk 3D tarda): cubre rAF detenido y, sin
  // WebGL, espera el armado 2D antes de avisar.
  useEffect(() => {
    if (webgl === null) return;
    const espera = webgl ? DURACION_PUERTA_MS + 1500 : duracionEnsamblado(false);
    const id = setTimeout(() => {
      if (!notificado.current) {
        notificado.current = true;
        alAbrirPuerta?.();
      }
    }, espera);
    return () => clearTimeout(id);
  }, [webgl, alAbrirPuerta]);

  if (webgl === false) return <Consultorio />;
  if (webgl === null) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden [&_*]:pointer-events-none!"
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: false }}
        shadows={false}
        camera={{ position: [0, 1.7, 2.4], fov: 68 }}
        frameloop={visible ? (puertaAbierta ? "demand" : "always") : "never"}
      >
        <Habitacion alAbrirse={alAbrirse} />
      </Canvas>
    </div>
  );
}
