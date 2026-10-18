"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { getPatientAvatarUri } from "@/components/game/patient-avatar";
import { fasePaciente, pasoWalk, posPaciente } from "@/lib/paciente3d";

/** Paciente de muestra; T3 reemplazará este ciclo por la ronda real. */
export function Paciente({ reducido }: { reducido: boolean }) {
  const uri = useMemo(() => getPatientAvatarUri("paciente-demostracion"), []);
  const cara = useLoader(THREE.TextureLoader, uri);
  const grupo = useRef<THREE.Group>(null);
  const piernaIzquierda = useRef<THREE.Group>(null);
  const piernaDerecha = useRef<THREE.Group>(null);
  const brazoIzquierdo = useRef<THREE.Group>(null);
  const brazoDerecho = useRef<THREE.Group>(null);
  const inicio = useRef<number | null>(null);

  useEffect(() => {
    cara.colorSpace = THREE.SRGBColorSpace;
    cara.needsUpdate = true;
  }, [cara]);

  useFrame(({ clock }) => {
    if (!grupo.current || reducido) return;
    if (inicio.current === null) inicio.current = clock.elapsedTime;
    const t = (clock.elapsedTime - inicio.current) * 1000;
    const fase = fasePaciente(t);
    grupo.current.visible = fase !== "fuera";
    grupo.current.position.set(...posPaciente(t));
    grupo.current.rotation.y = fase === "saliendo" ? Math.PI : 0;
    const swing = fase === "entrando" || fase === "saliendo" ? Math.sin(pasoWalk(t)) * 0.5 : 0;
    if (piernaIzquierda.current) piernaIzquierda.current.rotation.x = swing;
    if (piernaDerecha.current) piernaDerecha.current.rotation.x = -swing;
    if (brazoIzquierdo.current) brazoIzquierdo.current.rotation.x = -swing * 0.45;
    if (brazoDerecho.current) brazoDerecho.current.rotation.x = swing * 0.45;
  });

  return (
    <group ref={grupo} position={reducido ? [0, 0, 0] : [0, 0, -3.6]}>
      <group ref={piernaIzquierda} position={[-0.13, 0.63, 0]}>
        <mesh position={[0, -0.32, 0]}>
          <boxGeometry args={[0.19, 0.62, 0.2]} />
          <meshLambertMaterial color="#514d6b" />
        </mesh>
      </group>
      <group ref={piernaDerecha} position={[0.13, 0.63, 0]}>
        <mesh position={[0, -0.32, 0]}>
          <boxGeometry args={[0.19, 0.62, 0.2]} />
          <meshLambertMaterial color="#514d6b" />
        </mesh>
      </group>
      <mesh position={[0, 0.94, 0]}>
        <boxGeometry args={[0.52, 0.62, 0.28]} />
        <meshLambertMaterial color="#72959b" />
      </mesh>
      <group ref={brazoIzquierdo} position={[-0.34, 1.18, 0]}>
        <mesh position={[0, -0.26, 0]}>
          <boxGeometry args={[0.15, 0.5, 0.19]} />
          <meshLambertMaterial color="#72959b" />
        </mesh>
      </group>
      <group ref={brazoDerecho} position={[0.34, 1.18, 0]}>
        <mesh position={[0, -0.26, 0]}>
          <boxGeometry args={[0.15, 0.5, 0.19]} />
          <meshLambertMaterial color="#72959b" />
        </mesh>
      </group>
      <mesh position={[0, 1.37, 0]}>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshLambertMaterial color="#d9b995" />
      </mesh>
      {/* La cara queda hacia el doctor (+z) mientras el paciente espera. */}
      <mesh position={[0, 1.37, 0.205]}>
        <planeGeometry args={[0.34, 0.34]} />
        <meshBasicMaterial map={cara} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
