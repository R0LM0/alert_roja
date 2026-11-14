import { describe, expect, it } from "vitest";
import { pacienteDeSemilla, pacientesDeRonda } from "./pacientes";
import {
  alturaEcg,
  DURACION_ANALISIS_MS,
  ENCABEZADO_MONITOR,
  estadoMonitor,
  PERIODO_BARRIDO_MS,
  TEXTO_ANALIZANDO,
  colocacionMonitor,
  GIRO_MONITOR_Y,
  lineasMonitor,
  PALABRAS_PROHIBIDAS,
  POS_MONITOR,
  RESULTADO_MONITOR,
} from "./monitor";

const textoPantalla = (nombre?: string) => Object.values(lineasMonitor(nombre)).join(" | ");

describe("pantalla del monitor (no filtra la verdad del caso)", () => {
  it("el resultado es siempre POSITIVO, sin importar el paciente", () => {
    expect(RESULTADO_MONITOR).toBe("POSITIVO");
    for (const seed of ["a", "b", "ronda-1:3", "x"]) {
      expect(lineasMonitor(pacienteDeSemilla(seed).nombre).resultado).toBe("Resultado: POSITIVO");
    }
  });

  it("ningún texto fijo contiene palabras de infección, probabilidad o verdad", () => {
    expect(PALABRAS_PROHIBIDAS.test(textoPantalla())).toBe(false);
    expect(PALABRAS_PROHIBIDAS.test(ENCABEZADO_MONITOR)).toBe(false);
  });

  it("ningún paciente de la ronda cuela palabras prohibidas en la pantalla", () => {
    for (const { nombre } of pacientesDeRonda("semilla-de-prueba", 20)) {
      expect(PALABRAS_PROHIBIDAS.test(textoPantalla(nombre))).toBe(false);
    }
  });

  it("el detector sí atrapa las palabras que no deben salir", () => {
    for (const malo of ["Infectado", "contagio", "prevalencia 12%", "probabilidad", "sensibilidad", "Bayes", "verdadero"]) {
      expect(PALABRAS_PROHIBIDAS.test(malo)).toBe(true);
    }
  });

  it("solo el nombre varía entre turnos", () => {
    const sinNombre = lineasMonitor();
    const conNombre = lineasMonitor("Marlon Cruz");
    expect(conNombre.encabezado).toBe(sinNombre.encabezado);
    expect(conNombre.resultado).toBe(sinNombre.resultado);
    expect(conNombre.paciente).toBe("Paciente: Marlon Cruz");
    expect(sinNombre.paciente).toBe("Paciente: —");
  });

  it("recorta nombres largos para que quepan en la pantalla", () => {
    const largo = "Nombre Apellido Muy Largo Que No Cabe En La Pantalla";
    const linea = lineasMonitor(largo).paciente;
    expect(linea.length).toBeLessThanOrEqual("Paciente: ".length + 28);
    expect(linea.endsWith("…")).toBe(true);
  });
});

describe("posición del monitor en el escritorio", () => {
  it("queda a un costado del paciente (x=0), no encima de él", () => {
    // Semiancho del marco ~0.3 m: el borde izquierdo debe quedar lejos del centro.
    expect(POS_MONITOR[0] - 0.3).toBeGreaterThan(0.15);
  });

  it("queda sobre el escritorio (tope a 0.76) y dentro de su largo (z 0.8 a 1.6)", () => {
    expect(POS_MONITOR[1]).toBeCloseTo(0.76, 2);
    expect(POS_MONITOR[2]).toBeGreaterThan(0.8);
    expect(POS_MONITOR[2]).toBeLessThan(1.6);
  });

  it("la pantalla gira 25° a 35° hacia la cámara (la normal apunta al lado de x=0)", () => {
    const grados = Math.abs((GIRO_MONITOR_Y * 180) / Math.PI);
    expect(grados).toBeGreaterThanOrEqual(25);
    expect(grados).toBeLessThanOrEqual(35);
    // Normal local +Z tras el giro en Y: (sen θ, 0, cos θ); con x=+0.62 debe ir hacia x<0.
    expect(Math.sin(GIRO_MONITOR_Y)).toBeLessThan(0);
  });
});

describe("colocacionMonitor", () => {
  it("en escritorio usa la posición base y en celular se acerca al centro más chico", () => {
    expect(colocacionMonitor(1.6)).toEqual({ posicion: POS_MONITOR, escala: 1 });
    const movil = colocacionMonitor(390 / 844);
    expect(movil.posicion[0]).toBeLessThan(POS_MONITOR[0]);
    expect(movil.escala).toBeLessThan(1);
  });
});

describe("animación de la pantalla (estadoMonitor)", () => {
  it("primero analiza con una barra que avanza y luego muestra el resultado", () => {
    expect(estadoMonitor(0)).toMatchObject({ fase: "analizando", progreso: 0 });
    const medio = estadoMonitor(DURACION_ANALISIS_MS / 2);
    expect(medio.fase).toBe("analizando");
    expect(medio.progreso).toBeCloseTo(0.5, 5);
    expect(estadoMonitor(DURACION_ANALISIS_MS - 1).fase).toBe("analizando");
    expect(estadoMonitor(DURACION_ANALISIS_MS)).toMatchObject({ fase: "listo", progreso: 1 });
    expect(estadoMonitor(60_000)).toMatchObject({ fase: "listo", progreso: 1 });
  });

  it("el progreso nunca retrocede ni sale de 0..1", () => {
    let anterior = 0;
    for (let t = -500; t <= DURACION_ANALISIS_MS + 500; t += 50) {
      const { progreso } = estadoMonitor(t);
      expect(progreso).toBeGreaterThanOrEqual(anterior);
      expect(progreso).toBeLessThanOrEqual(1);
      anterior = progreso;
    }
  });

  it("el trazo del ECG barre la pantalla sin parar, también con el resultado a la vista", () => {
    expect(estadoMonitor(0).barrido).toBe(0);
    expect(estadoMonitor(PERIODO_BARRIDO_MS / 4).barrido).toBeCloseTo(0.25, 5);
    expect(estadoMonitor(PERIODO_BARRIDO_MS).barrido).toBe(0);
    expect(estadoMonitor(PERIODO_BARRIDO_MS * 7.5).barrido).toBeCloseTo(0.5, 5);
    expect(estadoMonitor(PERIODO_BARRIDO_MS / 2).vueltas).toBe(0);
    expect(estadoMonitor(PERIODO_BARRIDO_MS * 3.2).vueltas).toBe(3);
  });

  it("el cursor parpadea cada medio segundo", () => {
    expect(estadoMonitor(0).cursor).toBe(true);
    expect(estadoMonitor(499).cursor).toBe(true);
    expect(estadoMonitor(500).cursor).toBe(false);
    expect(estadoMonitor(1000).cursor).toBe(true);
  });

  it("con movimiento reducido la pantalla es estática: resultado listo, sin barrido ni cursor", () => {
    for (const t of [0, 300, DURACION_ANALISIS_MS, 99_999]) {
      expect(estadoMonitor(t, true)).toEqual({ fase: "listo", progreso: 1, barrido: null, vueltas: 0, cursor: false });
    }
  });

  it("el texto de análisis no filtra la verdad del caso", () => {
    expect(TEXTO_ANALIZANDO).toBe("Analizando muestra");
    expect(PALABRAS_PROHIBIDAS.test(TEXTO_ANALIZANDO)).toBe(false);
  });
});

describe("alturaEcg", () => {
  it("es plano en los extremos, tiene un pico por latido y se repite", () => {
    expect(alturaEcg(0)).toBe(0);
    expect(alturaEcg(1)).toBe(0);
    const muestras = Array.from({ length: 301 }, (_, i) => alturaEcg(i / 300));
    expect(Math.max(...muestras)).toBeCloseTo(1, 1);
    expect(Math.min(...muestras)).toBeCloseTo(-0.3, 5);
    expect(muestras.filter((y, i) => y > 0.9 && muestras[i - 1] <= 0.9).length).toBe(3);
    expect(alturaEcg(0.1)).toBeCloseTo(alturaEcg(0.1 + 1 / 3), 5);
  });

  it("fuera de 0..1 queda en la línea base", () => {
    expect(alturaEcg(-0.2)).toBe(0);
    expect(alturaEcg(1.4)).toBe(0);
  });
});
