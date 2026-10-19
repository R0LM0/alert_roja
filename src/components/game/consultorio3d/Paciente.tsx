"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  alphaEntrada,
  anguloSalida,
  coloresPaciente,
  debeAvisarLlegada,
  derivarAspecto,
  encorvamientoPaciente,
  escalaPaciente,
  fasePaciente,
  formaPaciente,
  identidadPaciente,
  pasoWalk,
  posPaciente,
  ritmoPaciente,
  type SalidaPaciente,
} from "@/lib/paciente3d";

type PropsPaciente = {
  seed: string;
  nombre: string;
  saliendo: boolean;
  salida: SalidaPaciente;
  alLlegar?: () => void;
  reducido: boolean;
};

const CALZADO = "#3d3430";
const ROPA_MEDIAS = "#4a4358";
const OJOS = "#2b2326";
const LABIOS = "#9a5a5a";
const MONTURA = "#3a3436";

/** Material mate y suave; `alpha` arranca en 0 para el fundido de entrada. */
function Mate({ color, alpha }: { color: string; alpha: number }) {
  return <meshStandardMaterial color={color} roughness={0.6} transparent opacity={alpha} depthWrite />;
}

/** Un paciente por turno; el cambio de key remonta el recorrido de entrada. */
export function Paciente({ seed, nombre, saliendo, salida, alLlegar, reducido }: PropsPaciente) {
  const { genero, edad } = useMemo(() => identidadPaciente(nombre, seed), [nombre, seed]);
  const aspecto = useMemo(() => derivarAspecto(seed), [seed]);
  const colores = useMemo(() => coloresPaciente(seed), [seed]);
  const forma = useMemo(() => formaPaciente(seed, genero, edad), [seed, genero, edad]);
  const escala = escalaPaciente(edad, aspecto.altura);
  const ancho = aspecto.contextura * (genero === "mujer" ? 0.92 : 1.06);
  const hombros = genero === "mujer" ? 0.2 : 0.235;
  const cabeza = edad === "nino" ? 1.22 : 1;
  const encorvado = encorvamientoPaciente(edad);
  const alphaInicial = reducido ? 1 : 0;
  // Posición inicial estable: un arreglo nuevo en cada render hacía que R3F devolviera
  // al paciente a la puerta cuando el turno se re-renderizaba tras su llegada.
  const posicionInicial = useMemo(() => posPaciente(0, false, reducido), [reducido]);
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
    if (!debeAvisarLlegada(0, llegadaAvisada.current, reducido, saliendo) || !reducido) return;
    llegadaAvisada.current = true;
    alLlegarActual.current?.();
  }, [reducido, saliendo]);

  useFrame(() => {
    if (!grupo.current || reducido) return;
    // Reloj propio: R3F reinicia clock.elapsedTime al pasar de "always" a "demand" (justo
    // cuando el paciente llega), y el tiempo negativo lo devolvía a la puerta.
    const ahora = performance.now() / 1000;
    if (inicioEntrada.current === null) inicioEntrada.current = ahora;
    if (saliendo && inicioSalida.current === null) inicioSalida.current = ahora;
    const t = (ahora - (saliendo ? inicioSalida.current! : inicioEntrada.current)) * 1000;
    const fase = fasePaciente(t, saliendo);
    if (debeAvisarLlegada(t, llegadaAvisada.current, reducido, saliendo)) {
      llegadaAvisada.current = true;
      alLlegarActual.current?.();
    }
    grupo.current.visible = fase !== "fuera";
    grupo.current.position.set(...posPaciente(t, saliendo, false, salida));
    grupo.current.rotation.y = saliendo ? anguloSalida(t, salida) : 0;
    if (!saliendo && !fundidoCompleto.current) {
      const alpha = alphaEntrada(t);
      grupo.current.traverse((objeto) => {
        if (objeto instanceof THREE.Mesh && !Array.isArray(objeto.material)) objeto.material.opacity = alpha;
      });
      fundidoCompleto.current = alpha === 1;
    }
    // Las personas mayores caminan más lento; los niños, más rápido.
    const amplitud = edad === "mayor" ? 0.36 : 0.5;
    const swing = fase === "entrando" || fase === "saliendo" ? Math.sin(pasoWalk(t * ritmoPaciente(edad))) * amplitud : 0;
    if (piernaIzquierda.current) piernaIzquierda.current.rotation.x = swing;
    if (piernaDerecha.current) piernaDerecha.current.rotation.x = -swing;
    if (brazoIzquierdo.current) brazoIzquierdo.current.rotation.x = -swing * 0.45;
    if (brazoDerecho.current) brazoDerecho.current.rotation.x = swing * 0.45;
  });

  if (reducido && saliendo) return null;

  const a = alphaInicial;
  const piel = colores.piel;
  const colorPierna = edad === "nino" ? piel : genero === "mujer" ? ROPA_MEDIAS : forma.inferior;
  const pelo = forma.colorPelo;

  return (
    <group ref={grupo} position={posicionInicial}>
      {/* Escala uniforme: la estatura y la edad cambian el cuerpo entero, no solo una caja. */}
      <group scale={escala}>
        <group ref={piernaIzquierda} position={[-0.11, 0.82, 0]}>
          <mesh position={[0, -0.41, 0]}>
            <capsuleGeometry args={[0.085, 0.65, 6, 12]} />
            <Mate color={colorPierna} alpha={a} />
          </mesh>
          <mesh position={[0, -0.78, 0.04]} scale={[1, 0.5, 1.6]}>
            <sphereGeometry args={[0.1, 12, 8]} />
            <Mate color={CALZADO} alpha={a} />
          </mesh>
        </group>
        <group ref={piernaDerecha} position={[0.11, 0.82, 0]}>
          <mesh position={[0, -0.41, 0]}>
            <capsuleGeometry args={[0.085, 0.65, 6, 12]} />
            <Mate color={colorPierna} alpha={a} />
          </mesh>
          <mesh position={[0, -0.78, 0.04]} scale={[1, 0.5, 1.6]}>
            <sphereGeometry args={[0.1, 12, 8]} />
            <Mate color={CALZADO} alpha={a} />
          </mesh>
        </group>

        {/* Caderas: pantalón o short; la mujer lleva falda acampanada (cono). */}
        {forma.falda ? (
          <mesh position={[0, 0.78, 0]}>
            <cylinderGeometry args={[0.19, 0.42, 0.66, 18]} />
            <Mate color={forma.inferior} alpha={a} />
          </mesh>
        ) : (
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.19, 0.17, 0.2, 14]} />
            <Mate color={forma.inferior} alpha={a} />
          </mesh>
        )}

        {/* Tronco y cabeza giran juntos: la vejez encorva desde la cadera. */}
        <group position={[0, 0.84, 0]} rotation={[encorvado, 0, 0]}>
          <mesh position={[0, 0.28, 0]} scale={[ancho, 1, 0.9]}>
            <capsuleGeometry args={[0.19, 0.24, 6, 14]} />
            <Mate color={forma.superior} alpha={a} />
          </mesh>
          {forma.capucha && (
            <mesh position={[0, 0.66, -0.07]}>
              <sphereGeometry args={[0.14, 12, 8, 0, Math.PI * 2, 0.25 * Math.PI, 0.5 * Math.PI]} />
              <Mate color={forma.superior} alpha={a} />
            </mesh>
          )}
          <mesh position={[0, 0.66, 0]}>
            <cylinderGeometry args={[0.065, 0.07, 0.12, 10]} />
            <Mate color={piel} alpha={a} />
          </mesh>

          <group ref={brazoIzquierdo} position={[-hombros, 0.52, 0]}>
            <mesh position={[0, -0.272, 0]}>
              <capsuleGeometry args={[0.062, 0.42, 6, 10]} />
              <Mate color={forma.superior} alpha={a} />
            </mesh>
            <mesh position={[0, -0.57, 0]}>
              <sphereGeometry args={[0.068, 10, 8]} />
              <Mate color={piel} alpha={a} />
            </mesh>
          </group>
          <group ref={brazoDerecho} position={[hombros, 0.52, 0]}>
            <mesh position={[0, -0.272, 0]}>
              <capsuleGeometry args={[0.062, 0.42, 6, 10]} />
              <Mate color={forma.superior} alpha={a} />
            </mesh>
            <mesh position={[0, -0.57, 0]}>
              <sphereGeometry args={[0.068, 10, 8]} />
              <Mate color={piel} alpha={a} />
            </mesh>
            {forma.baston && (
              <group position={[0, 0, 0.06]}>
                <mesh position={[0, -0.96, 0]}>
                  <cylinderGeometry args={[0.016, 0.016, 0.8, 8]} />
                  <Mate color="#6b4a3a" alpha={a} />
                </mesh>
                <mesh position={[0, -0.56, 0]}>
                  <torusGeometry args={[0.04, 0.014, 6, 12]} />
                  <Mate color="#6b4a3a" alpha={a} />
                </mesh>
              </group>
            )}
          </group>

          {/* Cabeza: esfera con cara neutra (ojos, nariz, boca) y pelo como casquetes. */}
          <group position={[0, 0.72, 0]} scale={cabeza}>
            <mesh scale={[0.92, 1.04, 0.95]}>
              <sphereGeometry args={[0.165, 20, 14]} />
              <Mate color={piel} alpha={a} />
            </mesh>
            {[-1, 1].map((lado) => (
              <mesh key={`oreja-${lado}`} position={[lado * 0.16, 0, 0]} scale={[0.5, 1, 0.8]}>
                <sphereGeometry args={[0.035, 8, 6]} />
                <Mate color={piel} alpha={a} />
              </mesh>
            ))}
            {[-1, 1].map((lado) => (
              <group key={`ojo-${lado}`}>
                <mesh position={[lado * 0.058, 0.025, 0.15]}>
                  <sphereGeometry args={[0.021, 8, 6]} />
                  <Mate color={OJOS} alpha={a} />
                </mesh>
                <mesh position={[lado * 0.058, 0.062, 0.148]} rotation={[0, 0, Math.PI / 2]}>
                  <capsuleGeometry args={[0.007, 0.04, 4, 6]} />
                  <Mate color={pelo} alpha={a} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, -0.02, 0.16]} scale={[0.8, 1, 0.9]}>
              <sphereGeometry args={[0.022, 8, 6]} />
              <Mate color={piel} alpha={a} />
            </mesh>
            <mesh position={[0, -0.075, 0.148]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.006, 0.045, 4, 6]} />
              <Mate color={LABIOS} alpha={a} />
            </mesh>
            {forma.gafas && (
              <group>
                {[-1, 1].map((lado) => (
                  <mesh key={`lente-${lado}`} position={[lado * 0.058, 0.025, 0.158]}>
                    <torusGeometry args={[0.034, 0.006, 6, 16]} />
                    <Mate color={MONTURA} alpha={a} />
                  </mesh>
                ))}
                <mesh position={[0, 0.025, 0.16]} rotation={[0, 0, Math.PI / 2]}>
                  <capsuleGeometry args={[0.004, 0.05, 4, 6]} />
                  <Mate color={MONTURA} alpha={a} />
                </mesh>
              </group>
            )}

            {forma.peinado !== "calvo" && (
              <mesh position={[0, 0.012, -0.008]} scale={[1, 0.9, 1.03]}>
                <sphereGeometry args={[0.172, 16, 10, 0, Math.PI * 2, 0, (forma.peinado === "corto" ? 0.36 : 0.4) * Math.PI]} />
                <Mate color={pelo} alpha={a} />
              </mesh>
            )}
            {forma.peinado === "largo" && (
              <mesh position={[0, -0.14, -0.1]}>
                <capsuleGeometry args={[0.14, 0.2, 6, 12]} />
                <Mate color={pelo} alpha={a} />
              </mesh>
            )}
            {forma.peinado === "moño" && (
              <mesh position={[0, 0.1, -0.12]}>
                <sphereGeometry args={[0.07, 10, 8]} />
                <Mate color={pelo} alpha={a} />
              </mesh>
            )}
            {forma.peinado === "coleta" && (
              <mesh position={[0, -0.05, -0.19]} rotation={[0.5, 0, 0]}>
                <capsuleGeometry args={[0.04, 0.22, 5, 8]} />
                <Mate color={pelo} alpha={a} />
              </mesh>
            )}
            {forma.barba && (
              <>
                <mesh position={[0, -0.1, 0.03]} scale={[1, 0.8, 0.8]}>
                  <sphereGeometry args={[0.13, 14, 8, 0, Math.PI * 2, 0.55 * Math.PI, 0.45 * Math.PI]} />
                  <Mate color={pelo} alpha={a} />
                </mesh>
                <mesh position={[0, -0.065, 0.16]} rotation={[0, 0, Math.PI / 2]}>
                  <capsuleGeometry args={[0.008, 0.05, 4, 6]} />
                  <Mate color={pelo} alpha={a} />
                </mesh>
              </>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}
