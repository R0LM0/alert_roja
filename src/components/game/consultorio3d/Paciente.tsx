"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { getPatientAvatarUri } from "@/components/game/patient-avatar";
import { alphaEntrada, anguloSalida, coloresPaciente, debeAvisarLlegada, derivarAspecto, fasePaciente, pasoWalk, posPaciente } from "@/lib/paciente3d";

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
  const colores = useMemo(() => coloresPaciente(seed), [seed]);
  const aspecto = useMemo(() => derivarAspecto(seed), [seed]);
  const alphaInicial = reducido ? 1 : 0;
  const grupo = useRef<THREE.Group>(null);
  const piernaIzquierda = useRef<THREE.Group>(null);
  const piernaDerecha = useRef<THREE.Group>(null);
  const brazoIzquierdo = useRef<THREE.Group>(null);
  const brazoDerecho = useRef<THREE.Group>(null);
  const inicioEntrada = useRef<number | null>(null);
  const inicioSalida = useRef<number | null>(null);
  const llegadaAvisada = useRef(false);
  const fundidoCompleto = useRef(reducido);
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
    grupo.current.rotation.y = saliendo ? anguloSalida(t) : 0;
    if (!saliendo && !fundidoCompleto.current) {
      const alpha = alphaEntrada(t);
      grupo.current.traverse((objeto) => {
        if (objeto instanceof THREE.Mesh && !Array.isArray(objeto.material)) objeto.material.opacity = alpha;
      });
      fundidoCompleto.current = alpha === 1;
    }
    const swing = fase === "entrando" || fase === "saliendo" ? Math.sin(pasoWalk(t)) * 0.5 : 0;
    if (piernaIzquierda.current) piernaIzquierda.current.rotation.x = swing;
    if (piernaDerecha.current) piernaDerecha.current.rotation.x = -swing;
    if (brazoIzquierdo.current) brazoIzquierdo.current.rotation.x = -swing * 0.45;
    if (brazoDerecho.current) brazoDerecho.current.rotation.x = swing * 0.45;
  });

  if (reducido && saliendo) return null;

  return (
    <group ref={grupo} position={posPaciente(0, false, reducido)} scale={[1, aspecto.altura / 1.57, 1]}>
      <group scale={[aspecto.contextura, 1, aspecto.contextura]}>
        <group ref={piernaIzquierda} position={[-0.13, 0.63, 0]}>
          <mesh position={[0, -0.32, 0]}>
            <boxGeometry args={[0.19, 0.62, 0.2]} />
            <meshLambertMaterial color={colores.pantalon} transparent opacity={alphaInicial} depthWrite />
          </mesh>
        </group>
        <group ref={piernaDerecha} position={[0.13, 0.63, 0]}>
          <mesh position={[0, -0.32, 0]}>
            <boxGeometry args={[0.19, 0.62, 0.2]} />
            <meshLambertMaterial color={colores.pantalon} transparent opacity={alphaInicial} depthWrite />
          </mesh>
        </group>
        <mesh position={[0, 0.94, 0]}>
          <boxGeometry args={[0.52, 0.62, 0.28]} />
          <meshLambertMaterial color={aspecto.atuendo === "chaleco" ? "#c4beb1" : colores.camisa} transparent opacity={alphaInicial} depthWrite />
        </mesh>
        {aspecto.atuendo === "bata" && ([-0.17, 0.17] as const).map((x) => (
          <mesh key={x} position={[x, 0.94, 0.16]}>
            <boxGeometry args={[0.16, 0.64, 0.06]} />
            <meshLambertMaterial color="#e4e1d9" transparent opacity={alphaInicial} depthWrite />
          </mesh>
        ))}
        {aspecto.atuendo === "chaleco" && (
          <mesh position={[0, 0.97, 0.16]}>
            <boxGeometry args={[0.44, 0.48, 0.06]} />
            <meshLambertMaterial color={colores.camisa} transparent opacity={alphaInicial} depthWrite />
          </mesh>
        )}
        <group ref={brazoIzquierdo} position={[-0.34, 1.18, 0]}>
          <mesh position={[0, -0.26, 0]}>
            <boxGeometry args={[0.15, 0.5, 0.19]} />
            <meshLambertMaterial color={aspecto.atuendo === "bata" ? "#e4e1d9" : aspecto.atuendo === "chaleco" ? "#c4beb1" : colores.camisa} transparent opacity={alphaInicial} depthWrite />
          </mesh>
        </group>
        <group ref={brazoDerecho} position={[0.34, 1.18, 0]}>
          <mesh position={[0, -0.26, 0]}>
            <boxGeometry args={[0.15, 0.5, 0.19]} />
            <meshLambertMaterial color={aspecto.atuendo === "bata" ? "#e4e1d9" : aspecto.atuendo === "chaleco" ? "#c4beb1" : colores.camisa} transparent opacity={alphaInicial} depthWrite />
          </mesh>
        </group>
      </group>
      <mesh position={[0, 1.37, 0]}>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshLambertMaterial color={colores.piel} transparent opacity={alphaInicial} depthWrite />
      </mesh>
      {aspecto.pelo === "corto" && (
        <mesh position={[0, 1.53, -0.04]}>
          <boxGeometry args={[0.38, 0.1, 0.29]} />
          <meshLambertMaterial color={aspecto.colorPelo} transparent opacity={alphaInicial} depthWrite />
        </mesh>
      )}
      {aspecto.pelo === "largo" && (
        <mesh position={[0, 1.34, -0.21]}>
          <boxGeometry args={[0.39, 0.43, 0.1]} />
          <meshLambertMaterial color={aspecto.colorPelo} transparent opacity={alphaInicial} depthWrite />
        </mesh>
      )}
      {aspecto.pelo === "rizado" && ([-0.14, 0, 0.14] as const).map((x) => (
        <mesh key={x} position={[x, 1.53, -0.04]}>
          <sphereGeometry args={[0.09, 6, 4]} />
          <meshLambertMaterial color={aspecto.colorPelo} transparent opacity={alphaInicial} depthWrite />
        </mesh>
      ))}
      {/* Plano erguido con normal +z hacia el doctor; z=.23 supera la frente del radio .2. */}
      <mesh position={[0, 1.37, 0.23]}>
        <planeGeometry args={[0.34, 0.34]} />
        <meshBasicMaterial map={cara} transparent opacity={alphaInicial} depthWrite />
      </mesh>
    </group>
  );
}
