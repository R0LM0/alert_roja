import { describe, expect, it } from "vitest";
import { pacienteDeSemilla, pacientesDeRonda } from "./pacientes";
import {
  ENCABEZADO_MONITOR,
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
