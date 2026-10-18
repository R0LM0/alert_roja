import { describe, expect, it } from "vitest";
import {
  ORDEN_ENSAMBLADO,
  duracionEnsamblado,
  planEnsamblado,
  sinSolape,
  type CapaEscena,
} from "./consultorio-layout";

const CAPAS_CONTENIDO = ["puerta", "sala-espera", "escritorio", "camas"] as const;

function capa(plan: CapaEscena[], id: string): CapaEscena {
  const encontrada = plan.find((c) => c.id === id);
  if (!encontrada) throw new Error(`falta la capa ${id}`);
  return encontrada;
}

describe("planEnsamblado (armado de la escena)", () => {
  it("entra en el orden del armado: pared, piso, escritorio, camas, sala de espera, puerta", () => {
    expect(planEnsamblado(false).map((c) => c.id)).toEqual([...ORDEN_ENSAMBLADO]);
  });

  it("el escalonado es real: cada capa entra más tarde que la anterior", () => {
    const retardos = planEnsamblado(false).map((c) => c.retardoMs);
    for (let i = 1; i < retardos.length; i++) {
      expect(retardos[i]).toBeGreaterThan(retardos[i - 1]);
    }
  });

  it("el armado dura unos 2 s y se ve antes de la primera tarjeta (S13)", () => {
    const total = duracionEnsamblado(false);
    expect(total).toBeGreaterThanOrEqual(1800);
    expect(total).toBeLessThanOrEqual(2300);
    // El escalonado cruza toda la ventana: la última capa entra tarde.
    const plan = planEnsamblado(false);
    expect(plan[plan.length - 1].retardoMs).toBeGreaterThanOrEqual(1200);
  });

  it("cada capa queda dentro del lienzo (porcentajes 0..100)", () => {
    for (const c of planEnsamblado(false)) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x + c.ancho).toBeLessThanOrEqual(100);
      expect(c.y + c.alto).toBeLessThanOrEqual(100);
    }
  });

  it("el contenido no se solapa: puerta, sala de espera, escritorio y camas ocupan lugares propios", () => {
    const plan = planEnsamblado(false);
    for (const a of CAPAS_CONTENIDO) {
      for (const b of CAPAS_CONTENIDO) {
        if (a >= b) continue;
        expect(sinSolape(capa(plan, a), capa(plan, b))).toBe(true);
      }
    }
  });

  it("la puerta y las sillas apoyan en la línea del piso (para caminar en las tareas siguientes)", () => {
    const plan = planEnsamblado(false);
    const piso = capa(plan, "piso");
    expect(capa(plan, "puerta").y + capa(plan, "puerta").alto).toBe(piso.y);
    expect(capa(plan, "sala-espera").y + capa(plan, "sala-espera").alto).toBe(piso.y);
  });
});

describe("planEnsamblado con movimiento reducido", () => {
  it("muestra el estado final sin escalonado: todos los retardos en cero", () => {
    for (const c of planEnsamblado(true)) {
      expect(c.retardoMs).toBe(0);
    }
  });

  it("solo cambia el tiempo: la geometría es idéntica a la del armado animado", () => {
    const animado = planEnsamblado(false);
    const reducido = planEnsamblado(true);
    expect(reducido.map((c) => c.id)).toEqual(animado.map((c) => c.id));
    for (let i = 0; i < animado.length; i++) {
      const { retardoMs: _, ...geometriaA } = animado[i];
      const { retardoMs: __, ...geometriaB } = reducido[i];
      expect(geometriaB).toEqual(geometriaA);
    }
  });
});
