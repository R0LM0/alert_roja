"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

/** Hora actual que se actualiza cada segundo (para "hace 5 s" y "actualizado hace X s"). */
export function useAhora(): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return ahora;
}

/**
 * Número que cuenta hasta `destino` con un tween de motion (desde 0 en la primera carga).
 * Con movimiento reducido salta directo al valor. `null`/`undefined` se devuelven tal cual.
 */
export function useValorAnimado(destino: number | null | undefined, duracion = 0.9): number | null | undefined {
  const reducido = useReducedMotion();
  const [mostrado, setMostrado] = useState<number | null | undefined>(() => (destino == null ? destino : 0));
  // Último valor mostrado: un cambio a mitad del tween arranca desde ahí, sin saltos.
  const actual = useRef(0);

  useEffect(() => {
    if (destino === null || destino === undefined) {
      actual.current = 0;
      setMostrado(destino);
      return;
    }
    if (reducido) {
      actual.current = destino;
      setMostrado(destino);
      return;
    }
    const control = animate(actual.current, destino, {
      duration: duracion,
      ease: "easeOut",
      onUpdate: (v) => {
        actual.current = v;
        setMostrado(v);
      },
    });
    return () => control.stop();
  }, [destino, reducido, duracion]);

  return mostrado;
}

/**
 * Cuenta los cambios de `valor` después de la primera carga. Usarlo como clave de `Destello`.
 * Pasar el valor final (no el animado), o cada cuadro del tween contaría como cambio.
 */
export function useDestello(valor: unknown): number {
  const [veces, setVeces] = useState(0);
  const previo = useRef(valor);
  useEffect(() => {
    if (Object.is(previo.current, valor)) return;
    const habiaDato = previo.current !== undefined;
    previo.current = valor;
    if (habiaDato && valor !== undefined) setVeces((n) => n + 1);
  }, [valor]);
  return veces;
}
