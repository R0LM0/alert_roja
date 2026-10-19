import { describe, expect, it } from "vitest";
import {
  PREVALENCIA,
  PREVALENCIA_EXPERTO,
  frecuenciasNaturales,
  insignias,
  puntajePartida,
  puntajeRespuesta,
  resumir,
  sortearPositivo,
  vpnBayes,
  vppBayes,
  type Respuesta,
} from "./stats";

describe("stats", () => {
  it("VPP = 1/3 con el escenario del catálogo", () => {
    expect(vppBayes()).toBeCloseTo(1 / 3, 4);
  });

  it("VPN ≈ 0.9863", () => {
    expect(vpnBayes()).toBeCloseTo(0.9863, 4);
  });

  it("frecuencias naturales: 90 / 180 / 10 / 720", () => {
    expect(frecuenciasNaturales()).toEqual({ vp: 90, fp: 180, fn: 10, vn: 720 });
  });

  it("resumen sin datos no divide entre cero", () => {
    const r = resumir([]);
    expect(r.n).toBe(0);
    expect(r.vppObservadoPct).toBeNull();
  });

  it("ignora estimaciones nulas sin perder el conteo de decisiones", () => {
    const r = resumir([mk(null, "aislar", false), mk(60, "liberar", false), mk(null, "aislar", true)]);
    expect(r).toMatchObject({ n: 3, estimacionPromedioPct: 60, pctSobreestiman: 100 });
    expect(r.pctAislados).toBeCloseTo(200 / 3);
    expect(resumir([mk(null, "liberar", true)]).estimacionPromedioPct).toBeNull();
    expect(resumir([mk(null, "liberar", true)]).pctSobreestiman).toBeNull();
  });

  it("resumen calcula promedio y VPP observado", () => {
    const r = resumir([
      { estimacion_pct: 90, decision: "aislar", estaba_infectado: true },
      { estimacion_pct: 70, decision: "aislar", estaba_infectado: false },
      { estimacion_pct: 50, decision: "liberar", estaba_infectado: false },
    ]);
    expect(r.estimacionPromedioPct).toBeCloseTo(70, 6);
    expect(r.vppObservadoPct).toBeCloseTo(33.33, 1);
    expect(r.aisladosSanos).toBe(1);
  });
});

describe("stats: prevalencia parametrizada", () => {
  it("VPP al 1% ≈ 0.0435 (0.009 / 0.207)", () => {
    expect(vppBayes(PREVALENCIA_EXPERTO)).toBeCloseTo(0.009 / 0.207, 6);
    expect(vppBayes(PREVALENCIA_EXPERTO)).toBeCloseTo(0.0435, 3);
  });

  it("frecuencias naturales al 1%: 9 / 198 / 1 / 792", () => {
    expect(frecuenciasNaturales(1000, PREVALENCIA_EXPERTO)).toEqual({ vp: 9, fp: 198, fn: 1, vn: 792 });
  });

  it("sortearPositivo respeta la prevalencia", () => {
    expect(sortearPositivo(() => 0.2, 0.1).infectado).toBe(true);
    expect(sortearPositivo(() => 0.2, PREVALENCIA_EXPERTO).infectado).toBe(false);
    expect(sortearPositivo(() => 0.3).infectado).toBe(true);
  });
});

describe("puntajeRespuesta", () => {
  it("100 cuando acierta el VPP exacto", () => {
    expect(puntajeRespuesta(33.3333, 33.3333)).toBe(100);
  });
  it("redondea 100 - |estimación - VPP|", () => {
    expect(puntajeRespuesta(78, (1 / 3) * 100)).toBe(55);
  });
  it("nunca baja de 0", () => {
    expect(puntajeRespuesta(100, 0)).toBe(0);
  });
  it("es simétrico: sobrestimar y subestimar por igual cuesta lo mismo", () => {
    expect(puntajeRespuesta(43, 33)).toBe(puntajeRespuesta(23, 33));
  });
});

const mk = (est: number | null, decision: "aislar" | "liberar", inf: boolean): Respuesta => ({
  estimacion_pct: est,
  decision,
  estaba_infectado: inf,
});

describe("puntajePartida", () => {
  it("puntúa acciones óptimas por evidencia aunque la verdad oculta contradiga la decisión", () => {
    const rs = [mk(null, "liberar", true), mk(null, "aislar", false)];
    const ronda = [{ orden: 1, evidencia: "protegido" as const }, { orden: 2, evidencia: "contacto" as const }];
    expect(puntajePartida(rs, { modo: "normal", ronda })).toBe(2);
    expect(puntajePartida(rs, { modo: "experto", ronda })).toBe(1);
  });
  it("empareja evidencia por orden cuando las respuestas no están ordenadas", () => {
    const rs = [
      { ...mk(null, "aislar", false), orden: 2 },
      { ...mk(null, "liberar", true), orden: 1 },
    ];
    const ronda = [{ orden: 1, evidencia: "protegido" as const }, { orden: 2, evidencia: "contacto" as const }];
    expect(puntajePartida(rs, { modo: "normal", ronda })).toBe(2);
  });
  it("sin evidencia usa sin antecedentes para todas las filas y respeta el modo", () => {
    const rs = [mk(33, "aislar", false), mk(null, "liberar", true), mk(90, "aislar", false)];
    expect(puntajePartida(rs, PREVALENCIA)).toBe(2);
    expect(puntajePartida(rs, PREVALENCIA_EXPERTO)).toBe(1);
  });
  it("sin respuestas = 0", () => {
    expect(puntajePartida([], PREVALENCIA)).toBe(0);
  });
});

describe("insignias", () => {
  it("premia 10 decisiones óptimas aunque no coincidan con la infección; cazador exige aislar infectados", () => {
    const rs = Array.from({ length: 10 }, () => mk(null, "liberar", true));
    const ronda = rs.map((_, i) => ({ orden: i + 1, evidencia: "protegido" as const }));
    expect(insignias(rs, { modo: "normal", ronda })).toEqual(["perfecto", "sin-panico"]);
    expect(insignias(rs.map((r, i) => i < 2 ? { ...r, decision: "aislar" as const } : r), { modo: "normal", ronda })).toEqual(["ojo-clinico", "sin-panico"]);
  });
  const diez = (est: number | null, d: "aislar" | "liberar") => Array.from({ length: 10 }, () => mk(est, d, false));
  const protegidos = { modo: "normal" as const, ronda: Array.from({ length: 10 }, (_, i) => ({ orden: i + 1, evidencia: "protegido" as const })) };
  it("bayesiano-nato con promedio en [25, 40] solo cuando hay estimaciones", () => {
    const soloSanos = diez(null, "liberar");
    expect(insignias(soloSanos, protegidos)).toEqual(["perfecto", "sin-panico"]);
    expect(insignias([...soloSanos.slice(0, 9), mk(33, "liberar", false)], protegidos)).toEqual(["perfecto", "sin-panico", "bayesiano-nato"]);
  });
  it("cazador requiere infectados y haber aislado a todos", () => {
    const conInfectados = [mk(null, "aislar", true), mk(null, "aislar", true), ...diez(null, "liberar").slice(0, 8)];
    expect(insignias(conInfectados, { modo: "normal", ronda: protegidos.ronda.map((p, i) => ({ ...p, evidencia: i < 2 ? "contacto" as const : "protegido" as const })) })).toEqual(["perfecto", "cazador", "sin-panico"]);
    expect(insignias(diez(null, "liberar"), protegidos)).toEqual(["perfecto", "sin-panico"]);
    const sieteAciertos = [...conInfectados.slice(0, 2), ...diez(null, "aislar").slice(0, 3), ...diez(null, "liberar").slice(0, 5)];
    expect(insignias(sieteAciertos, { modo: "normal", ronda: protegidos.ronda.map((p, i) => ({ ...p, evidencia: i < 2 ? "contacto" as const : "protegido" as const })) })).toEqual(["cazador"]);
    expect(insignias([{ ...conInfectados[0], decision: "liberar" }, ...conInfectados.slice(1)])).not.toContain("cazador");
  });
  it("ojo clínico solo con 8-9 aciertos de diez, perfecto solo con diez", () => {
    const todos = diez(null, "liberar");
    expect(insignias([{ ...todos[0], decision: "aislar" }, ...todos.slice(1)], protegidos)).toEqual(["ojo-clinico"]);
    expect(insignias([...diez(null, "aislar").slice(0, 3), ...todos.slice(3)], protegidos)).toEqual([]);
    expect(insignias(todos.slice(0, 9), protegidos)).toEqual([]);
    expect(insignias([])).toEqual([]);
  });
  it("los límites 25 y 40 del promedio legacy son inclusivos; justo afuera no", () => {
    const conEstimacion = (est: number) => diez(est, "liberar");
    expect(insignias(conEstimacion(25), protegidos)).toEqual(["perfecto", "sin-panico", "bayesiano-nato"]);
    expect(insignias(conEstimacion(40), protegidos)).toEqual(["perfecto", "sin-panico", "bayesiano-nato"]);
    expect(insignias(conEstimacion(24), protegidos)).toEqual(["perfecto", "sin-panico"]);
    expect(insignias(conEstimacion(41), protegidos)).toEqual(["perfecto", "sin-panico"]);
  });
});

describe("insignias: experto, rayo y sin pánico", () => {
  const diez = (est: number | null, d: "aislar" | "liberar") => Array.from({ length: 10 }, () => mk(est, d, false));
  const ctx = (evidencia: "protegido" | "sin-antecedentes" | "conviviente", modo: "normal" | "experto" = "normal") => ({
    modo,
    ronda: Array.from({ length: 10 }, (_, i) => ({ orden: i + 1, evidencia })),
  });

  it("experto: 7 o más decisiones óptimas, solo en modo experto", () => {
    const siete = [...diez(null, "liberar").slice(0, 7), ...diez(null, "aislar").slice(0, 3)];
    expect(insignias(siete, ctx("sin-antecedentes", "experto"))).toContain("experto");
    expect(insignias(siete, PREVALENCIA_EXPERTO)).toContain("experto");
    expect(insignias(siete, ctx("sin-antecedentes", "normal"))).not.toContain("experto");
    const seis = [...diez(null, "liberar").slice(0, 6), ...diez(null, "aislar").slice(0, 4)];
    expect(insignias(seis, ctx("sin-antecedentes", "experto"))).not.toContain("experto");
  });

  it("rayo: la suma de tiempos de la ronda debe quedar por debajo de 60 s y todos deben tener tiempo", () => {
    const con = (ms: number | undefined) => diez(null, "liberar").map((r) => ({ ...r, tiempo_ms: ms }));
    expect(insignias(con(5000), ctx("protegido"))).toContain("rayo");
    expect(insignias(con(6000), ctx("protegido"))).not.toContain("rayo");
    const sinTiempo = con(1000).map((r, i) => (i === 0 ? { ...r, tiempo_ms: undefined } : r));
    expect(insignias(sinTiempo, ctx("protegido"))).not.toContain("rayo");
    expect(insignias(diez(null, "liberar"), ctx("protegido"))).not.toContain("rayo");
  });

  it("sin pánico: ningún sano de poca evidencia aislado y al menos un paciente de poca evidencia", () => {
    const rs = diez(null, "liberar");
    expect(insignias(rs, ctx("protegido"))).toContain("sin-panico");
    const aisladoProtegido = rs.map((r, i) => (i === 1 ? { ...r, decision: "aislar" as const } : r));
    expect(insignias(aisladoProtegido, ctx("protegido"))).not.toContain("sin-panico");
    const aisladoContacto = rs.map((r, i) => (i === 1 ? { ...r, decision: "aislar" as const } : r));
    const conContacto = { modo: "normal" as const, ronda: rs.map((_, i) => ({ orden: i + 1, evidencia: i === 1 ? "contacto" as const : "protegido" as const })) };
    expect(insignias(aisladoContacto, conContacto)).toContain("sin-panico");
    expect(insignias(rs, ctx("conviviente"))).not.toContain("sin-panico");
    expect(insignias(rs, PREVALENCIA)).not.toContain("sin-panico");
  });
});
