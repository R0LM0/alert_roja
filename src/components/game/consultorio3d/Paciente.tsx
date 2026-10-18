"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { getPatientAvatarUri } from "@/components/game/patient-avatar";
import { debeAvisarLlegada, fasePaciente, pasoWalk, posPaciente } from "@/lib/paciente3d";

type PropsPaciente = {
  seed: string;
  saliendo: boolean;
  alLlegar?: () => void;
  reducido: boolean;
};

/** Un paciente por turno; el cambio de key remonta el recorrido de entrada. */
export function Paciente({ seed, saliendo, alLlegar, reducido }: PropsPaciente) {
  const uri = useMemo(() => getPatientAvatarUri(seed), [seed]);
  const cara = useLoader(THREE.TextureLoader, uri);
  const grupo = useRef<THREE.Group>(null);
  const piernaIzquierda = useRef<THREE.Group>(null);
  const piernaDerecha = useRef<THREE.Group>(null);
  const brazoIzquierdo = useRef<THREE.Group>(null);
  const brazoDerecho = useRef<THREE.Group>(null);
  const inicioEntrada = useRef<number | null>(null);
  const inicioSalida = useRef<number | null>(null);
  const llegadaAvisada = useRef(false);
  const alLlegarActual = useRef(alLlegar);
  alLlegarActual.current = alLlegar;

  useEffect(() => {
    cara.colorSpace = THREE.SRGBColorSpace;
    cara.needsUpdate = true;
  }, [cara]);

  useEffect(() => {
    if (!debeAvisarLlegada(0, llegadaAvisada.current, reducido, saliendo) || !reducido) return;
    llegadaAvisada.current = true;
    alLlegarActual.current?.();
  }, [reducido, saliendo]);

  useFrame(({ clock }) => {
    if (!grupo.current || reducido) return;
    const ahora = clock.elapsedTime;
    if (inicioEntrada.current === null) inicioEntrada.current = ahora;
    if (saliendo && inicioSalida.current === null) inicioSalida.current = ahora;
    const t = (ahora - (saliendo ? inicioSalida.current! : inicioEntrada.current)) * 1000;
    const fase = fasePaciente(t, saliendo);
    if (debeAvisarLlegada(t, llegadaAvisada.current, reducido, saliendo)) {
      llegadaAvisada.current = true;
      alLlegarActual.current?.();
    }
    grupo.current.visible = fase !== "fuera";
    grupo.current.position.set(...posPaciente(t, saliendo));
    grupo.current.rotation.y = fase === "saliendo" ? Math.PI : 0;
    const swing = fase === "entrando" || fase === "saliendo" ? Math.sin(pasoWalk(t)) * 0.5 : 0;
    if (piernaIzquierda.current) piernaIzquierda.current.rotation.x = swing;
    if (piernaDerecha.current) piernaDerecha.current.rotation.x = -swing;
    if (brazoIzquierdo.current) brazoIzquierdo.current.rotation.x = -swing * 0.45;
    if (brazoDerecho.current) brazoDerecho.current.rotation.x = swing * 0.45;
  });

  if (reducido && saliendo) return null;

  return (
    <group ref={grupo} position={posPaciente(0, false, reducido)}>
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
