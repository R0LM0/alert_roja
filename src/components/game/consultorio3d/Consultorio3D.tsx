"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Consultorio } from "@/components/game/consultorio/Consultorio";
import { prefiereReducido } from "@/components/three/CiudadRevelacion";
import {
  anguloPuerta,
  DURACION_ENTRADA_MS,
  DURACION_PUERTA_MS,
  faseIntro,
  objetivoCamara,
  posCamara,
  RETRASO_PUERTA_MS,
  webglDisponible,
} from "@/lib/consultorio3d";
import { duracionEnsamblado } from "@/lib/consultorio-layout";
import { Paciente } from "./Paciente";

type Punto = [number, number, number];
const FIN_INTRO_MS = RETRASO_PUERTA_MS + DURACION_PUERTA_MS + DURACION_ENTRADA_MS;

function Caja({ posicion, tamano, color }: { posicion: Punto; tamano: Punto; color: string }) {
  return (
    <mesh position={posicion}>
      <boxGeometry args={tamano} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

function Sombra({ x, z, radio }: { x: number; z: number; radio: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, z]}>
      <circleGeometry args={[radio, 16]} />
      <meshBasicMaterial color="#130e19" transparent opacity={0.23} depthWrite={false} />
    </mesh>
  );
}

function Silla({ x, color }: { x: number; color: string }) {
  return (
    <>
      <Sombra x={x} z={-2.1} radio={0.6} />
      <Caja posicion={[x, 0.54, -2.1]} tamano={[0.85, 0.15, 0.7]} color={color} />
      <Caja posicion={[x, 1.0, -2.43]} tamano={[0.85, 0.8, 0.12]} color={color} />
      <Caja posicion={[x - 0.29, 0.25, -2.1]} tamano={[0.1, 0.5, 0.58]} color="#493448" />
      <Caja posicion={[x + 0.29, 0.25, -2.1]} tamano={[0.1, 0.5, 0.58]} color="#493448" />
    </>
  );
}

function Maceta({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.23, 0]}>
        <cylinderGeometry args={[0.28, 0.22, 0.42, 8]} />
        <meshLambertMaterial color="#a96c55" />
      </mesh>
      <mesh position={[-0.13, 0.64, 0]} scale={[1, 1.25, 0.85]}>
        <sphereGeometry args={[0.23, 8, 6]} />
        <meshLambertMaterial color="#467d60" />
      </mesh>
      <mesh position={[0.13, 0.76, -0.07]} scale={[1, 1.35, 0.85]}>
        <sphereGeometry args={[0.23, 8, 6]} />
        <meshLambertMaterial color="#62966b" />
      </mesh>
      <mesh position={[0, 0.98, 0.06]} scale={[0.9, 1.15, 0.85]}>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshLambertMaterial color="#467d60" />
      </mesh>
    </group>
  );
}

function Escenario() {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 4, 3]} intensity={0.5} />
      {/* Pasillo estrecho: la abertura deja ver el interior cálido desde la oscuridad. */}
      <Caja posicion={[0, -0.06, -6.4]} tamano={[4.2, 0.1, 5]} color="#14101c" />
      {/* El pasillo termina detrás de la cara posterior del muro (-4.05):
          antes llegaba a -3.9 y sus testas oscuras se veían sobre el muro crema. */}
      <Caja posicion={[-2.1, 1.5, -6.5]} tamano={[0.1, 3, 4.8]} color="#1e1726" />
      <Caja posicion={[2.1, 1.5, -6.5]} tamano={[0.1, 3, 4.8]} color="#1e1726" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -5.55]}>
        <planeGeometry args={[1.45, 2.8]} />
        <meshLambertMaterial color="#875a54" />
      </mesh>
      <Maceta x={1.45} z={-5.7} />
      <mesh position={[0, 2.35, -8.3]}>
        <planeGeometry args={[0.42, 0.25]} />
        <meshBasicMaterial color="#db945f" transparent opacity={0.7} />
      </mesh>

      <Caja posicion={[0, -0.06, 0.5]} tamano={[10, 0.1, 9]} color="#d79b60" />
      <Caja posicion={[-2.85, 1.5, -4]} tamano={[4.3, 3, 0.1]} color="#f3e2cc" />
      <Caja posicion={[2.85, 1.5, -4]} tamano={[4.3, 3, 0.1]} color="#f3e2cc" />
      <Caja posicion={[0, 2.8, -4]} tamano={[1.4, 0.4, 0.1]} color="#f3e2cc" />
      <Caja posicion={[-5, 1.5, 0.5]} tamano={[0.1, 3, 9]} color="#f3e2cc" />
      <Caja posicion={[5, 1.5, 0.5]} tamano={[0.1, 3, 9]} color="#f3e2cc" />
      <Caja posicion={[0, 1.5, 5]} tamano={[10, 3, 0.1]} color="#e4c9ac" />
      {/* Cara interior oscura del hueco, invisible desde el pasillo. */}
      <mesh position={[0, 1.3, -4.2]}>
        <planeGeometry args={[1.4, 2.6]} />
        <meshBasicMaterial color="#1a1626" />
      </mesh>
      <Caja posicion={[-0.75, 1.3, -3.9]} tamano={[0.1, 2.7, 0.18]} color="#aa7864" />
      <Caja posicion={[0.75, 1.3, -3.9]} tamano={[0.1, 2.7, 0.18]} color="#aa7864" />
      <Caja posicion={[0, 2.67, -3.9]} tamano={[1.6, 0.1, 0.18]} color="#aa7864" />
      <Caja posicion={[-4.9, 0.12, 0.5]} tamano={[0.12, 0.24, 8.8]} color="#ad745e" />
      <Caja posicion={[4.9, 0.12, 0.5]} tamano={[0.12, 0.24, 8.8]} color="#ad745e" />
      <Caja posicion={[0, 0.12, 4.87]} tamano={[9.8, 0.24, 0.12]} color="#ad745e" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -3.3]}>
        <planeGeometry args={[1.3, 0.48]} />
        <meshLambertMaterial color="#ad745e" />
      </mesh>
      <Maceta x={-4.25} z={-3.15} />

      <Sombra x={0} z={-0.45} radio={1.6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, -0.45]}>
        <circleGeometry args={[1.48, 32]} />
        <meshLambertMaterial color="#bd7180" />
      </mesh>
      {/* Una única luminaria puntual, sin sombras calculadas. */}
      <pointLight position={[0, 2.45, -0.7]} intensity={1} distance={6} decay={2} color="#ffd9a0" />
      <Caja posicion={[0, 2.8, -0.7]} tamano={[0.035, 0.42, 0.035]} color="#493448" />
      <mesh position={[0, 2.56, -0.7]}>
        <coneGeometry args={[0.37, 0.35, 12, 1, true]} />
        <meshLambertMaterial color="#e6a36a" emissive="#ffd9a0" emissiveIntensity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Ventana sobre la pared derecha; la luz del piso es una mancha bakeada. */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[4.93, 1.9, -1]}>
        <planeGeometry args={[1.7, 1.2]} />
        <meshBasicMaterial color="#cfe8ff" side={THREE.DoubleSide} />
      </mesh>
      <Caja posicion={[4.87, 1.9, -1.9]} tamano={[0.13, 1.34, 0.1]} color="#79677f" />
      <Caja posicion={[4.87, 1.9, -0.1]} tamano={[0.13, 1.34, 0.1]} color="#79677f" />
      <Caja posicion={[4.87, 2.55, -1]} tamano={[0.13, 0.1, 1.85]} color="#79677f" />
      <Caja posicion={[4.87, 1.25, -1]} tamano={[0.13, 0.1, 1.85]} color="#79677f" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.55, 0.02, -0.7]}>
        <planeGeometry args={[1.6, 2.2]} />
        <meshBasicMaterial color="#cfe8ff" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      {/* Repisa izquierda: libros de alturas distintas y planta de dos hojas. */}
      <Caja posicion={[-4.58, 1.52, -1.4]} tamano={[0.68, 0.09, 2]} color="#875a54" />
      {(["#e16665", "#4f9d98", "#dfaf64", "#7066a7", "#d3827b"] as const).map((color, i) => (
        <Caja key={color} posicion={[-4.6, 1.76 + (i % 2) * 0.05, -2.15 + i * 0.22]} tamano={[0.27, 0.4 + (i % 2) * 0.1, 0.17]} color={color} />
      ))}
      <mesh position={[-4.58, 1.69, -0.65]}>
        <cylinderGeometry args={[0.14, 0.1, 0.25, 8]} />
        <meshLambertMaterial color="#a96c55" />
      </mesh>
      <mesh position={[-4.62, 1.88, -0.72]}>
        <sphereGeometry args={[0.14, 8, 6]} />
        <meshLambertMaterial color="#467d60" />
      </mesh>
      <mesh position={[-4.5, 1.91, -0.59]}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshLambertMaterial color="#62966b" />
      </mesh>
      <Silla x={-2.5} color="#d57670" />
      <Silla x={2.5} color="#d9a455" />

      {/* Reloj discreto sobre el muro, lejos del marco de la puerta. */}
      <mesh position={[-3.55, 2.35, -3.875]}>
        <circleGeometry args={[0.26, 16]} />
        <meshLambertMaterial color="#fff1dc" />
      </mesh>
      <Caja posicion={[-3.55, 2.43, -3.83]} tamano={[0.025, 0.16, 0.02]} color="#493448" />
      <Caja posicion={[-3.48, 2.35, -3.83]} tamano={[0.14, 0.025, 0.02]} color="#493448" />

      {/* Cartel y póster en la pared de la puerta, dentro del encuadre final. */}
      <Caja posicion={[-1.15, 1.9, -3.91]} tamano={[0.68, 0.68, 0.07]} color="#ffffff" />
      <Caja posicion={[-1.15, 1.9, -3.86]} tamano={[0.12, 0.45, 0.04]} color="#e63946" />
      <Caja posicion={[-1.15, 1.9, -3.86]} tamano={[0.45, 0.12, 0.04]} color="#e63946" />
      <Caja posicion={[1.55, 1.85, -3.92]} tamano={[0.58, 0.7, 0.08]} color="#705877" />
      <Caja posicion={[1.55, 1.85, -3.86]} tamano={[0.44, 0.55, 0.04]} color="#8ac7ba" />

      {/* Mesa del médico y utilería a la vista desde el asiento. */}
      <Sombra x={0} z={1.2} radio={1.35} />
      <Caja posicion={[0, 0.72, 1.2]} tamano={[2.2, 0.08, 0.8]} color="#7c5cbf" />
      <Caja posicion={[0, 0.34, 0.84]} tamano={[2.05, 0.6, 0.08]} color="#655099" />
      <Caja posicion={[-0.5, 0.78, 1.07]} tamano={[0.52, 0.03, 0.32]} color="#fff1dc" />
      <Caja posicion={[-0.5, 0.8, 1.05]} tamano={[0.48, 0.02, 0.28]} color="#ffffff" />
      <Caja posicion={[0.25, 0.78, 1.03]} tamano={[0.48, 0.045, 0.3]} color="#e0a15d" />
      <mesh position={[0.74, 0.82, 1.2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.15, 10]} />
        <meshLambertMaterial color="#f6e1c4" />
      </mesh>
      <mesh position={[3.2, 0.22, 0.9]}>
        <cylinderGeometry args={[0.25, 0.2, 0.44, 10]} />
        <meshLambertMaterial color="#655c76" />
      </mesh>
    </>
  );
}

type PropsHabitacion = {
  alListo: () => void;
  listo: boolean;
  semillaPaciente?: string;
  saliendoPaciente?: boolean;
  alLlegarPaciente?: () => void;
};

function Habitacion({ alListo, listo, semillaPaciente, saliendoPaciente, alLlegarPaciente }: PropsHabitacion) {
  const { camera } = useThree();
  const bisagra = useRef<THREE.Group>(null);
  const inicio = useRef<number | null>(null);
  const reducido = useRef(prefiereReducido());

  useEffect(() => {
    const t = reducido.current || listo ? FIN_INTRO_MS : 0;
    camera.position.set(...posCamara(t));
    camera.lookAt(...objetivoCamara(t));
    camera.updateProjectionMatrix();
    if (bisagra.current) bisagra.current.rotation.y = anguloPuerta(t);
  }, [camera, listo]);

  useFrame(({ clock }) => {
    if (listo || reducido.current) return;
    if (inicio.current === null) inicio.current = clock.elapsedTime;
    const t = (clock.elapsedTime - inicio.current) * 1000;
    camera.position.set(...posCamara(t));
    camera.lookAt(...objetivoCamara(t));
    if (bisagra.current) bisagra.current.rotation.y = anguloPuerta(t);
    if (faseIntro(t) === "listo") alListo();
  });

  return (
    <>
      <Escenario />
      {listo && semillaPaciente && (
        <Paciente
          key={semillaPaciente}
          seed={semillaPaciente}
          saliendo={!!saliendoPaciente}
          alLlegar={alLlegarPaciente}
          reducido={reducido.current}
        />
      )}
      {/* El borde izquierdo coincide con el marco; el panel gira hacia dentro. */}
      <group ref={bisagra} position={[-0.7, 0, -3.95]}>
        <mesh position={[0.7, 1.3, 0]}>
          <boxGeometry args={[1.4, 2.6, 0.04]} />
          <meshLambertMaterial color="#2ec4b6" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[1.22, 1.2, 0.075]}>
          <sphereGeometry args={[0.075, 8, 6]} />
          <meshLambertMaterial color="#f3d1a0" />
        </mesh>
      </group>
    </>
  );
}

type PropsConsultorio3D = {
  alListo?: () => void;
  semillaPaciente?: string;
  saliendoPaciente?: boolean;
  alLlegarPaciente?: () => void;
};

/** Decorado de consultorio en primera persona; vuelve al SVG si falta WebGL. */
export default function Consultorio3D({ alListo, semillaPaciente, saliendoPaciente, alLlegarPaciente }: PropsConsultorio3D) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(true);
  const [listo, setListo] = useState(false);
  const [reducido, setReducido] = useState(false);
  const notificado = useRef(false);
  const montado = useRef<number | null>(null);
  const [llegoPaciente, setLlegoPaciente] = useState(false);
  const avisar = useCallback(() => {
    if (notificado.current) return;
    notificado.current = true;
    setListo(true);
    alListo?.();
  }, [alListo]);

  // El paciente camina solo al entrar y al salir; sentado está quieto.
  useEffect(() => {
    setLlegoPaciente(false);
  }, [semillaPaciente]);
  const avisarLlegada = useCallback(() => {
    setLlegoPaciente(true);
    alLlegarPaciente?.();
  }, [alLlegarPaciente]);
  const animando = !reducido && (!listo || !llegoPaciente || !!saliendoPaciente);

  useEffect(() => {
    montado.current = performance.now();
    setWebgl(webglDisponible());
    setReducido(prefiereReducido());
    const alCambiarVisibilidad = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => document.removeEventListener("visibilitychange", alCambiarVisibilidad);
  }, []);

  // Respaldo desde el montaje (no desde el primer frame); cubre rAF detenido.
  // Sin WebGL espera al armado del consultorio SVG antes de mostrar la tarjeta.
  useEffect(() => {
    if (webgl === null) return;
    if (webgl && prefiereReducido()) {
      avisar();
      return;
    }
    const espera = webgl ? FIN_INTRO_MS + 1500 : duracionEnsamblado(false);
    const restante = Math.max(0, espera - (performance.now() - (montado.current ?? performance.now())));
    const id = setTimeout(avisar, restante);
    return () => clearTimeout(id);
  }, [webgl, avisar]);

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
        camera={{ position: [0, 1.6, -5.4], fov: 68 }}
        frameloop={visible ? (animando ? "always" : "demand") : "never"}
      >
        <Habitacion
          alListo={avisar}
          listo={listo}
          semillaPaciente={semillaPaciente}
          saliendoPaciente={saliendoPaciente}
          alLlegarPaciente={avisarLlegada}
        />
      </Canvas>
    </div>
  );
}
