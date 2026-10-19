import { describe, expect, it } from "vitest";
import {
  ANGULO_PUERTA_ABIERTA,
  anguloPuerta,
  DURACION_PUERTA_MS,
  DURACION_ENTRADA_MS,
  faseIntro,
  objetivoCamara,
  posCamara,
  puertaAbierta,
  RETRASO_PUERTA_MS,
  webglDisponible,
} from "./consultorio3d";

describe("anguloPuerta (bisagra de la puerta, S3)", () => {
  it("espera un respiro con la puerta cerrada: la foto inicial es determinista", () => {
    expect(RETRASO_PUERTA_MS).toBeGreaterThanOrEqual(200);
    expect(anguloPuerta(0)).toBe(0);
    expect(anguloPuerta(RETRASO_PUERTA_MS - 50)).toBe(0);
    // ...y después abre del todo: el giro completo termina al final de la ventana.
    expect(anguloPuerta(RETRASO_PUERTA_MS + DURACION_PUERTA_MS)).toBe(ANGULO_PUERTA_ABIERTA);
    expect(anguloPuerta(RETRASO_PUERTA_MS + DURACION_PUERTA_MS + 5000)).toBe(ANGULO_PUERTA_ABIERTA);
  });

  it("la ventana activa dura ~1.5 s y termina del todo abierta", () => {
    expect(DURACION_PUERTA_MS).toBe(1500);
    expect(anguloPuerta(RETRASO_PUERTA_MS + DURACION_PUERTA_MS)).toBe(ANGULO_PUERTA_ABIERTA);
  });

  it("gira siempre hacia adentro, sin rebotes", () => {
    const muestras = [300, 550, 800, 1050, 1300, 1550, 1800].map(anguloPuerta);
    for (let i = 1; i < muestras.length; i++) {
      expect(muestras[i]).toBeLessThan(muestras[i - 1]);
    }
  });

  it("es ease-out: a mitad de la ventana activa ya pasó más de mitad del giro", () => {
    expect(Math.abs(anguloPuerta(RETRASO_PUERTA_MS + 750))).toBeGreaterThan(
      Math.abs(ANGULO_PUERTA_ABIERTA) / 2,
    );
  });
});

describe("puertaAbierta", () => {
  it("la primera tarjeta espera a la puerta del todo abierta", () => {
    expect(puertaAbierta(0)).toBe(false);
    expect(puertaAbierta(RETRASO_PUERTA_MS + DURACION_PUERTA_MS - 1)).toBe(false);
    expect(puertaAbierta(RETRASO_PUERTA_MS + DURACION_PUERTA_MS)).toBe(true);
  });
});

describe("intro cinematográfica (S2, S3, S9)", () => {
  const puertaLista = RETRASO_PUERTA_MS + DURACION_PUERTA_MS;
  const sentado = puertaLista + DURACION_ENTRADA_MS;

  it("abre la puerta antes de entrar, y solo avisa listo tras sentarse", () => {
    expect(DURACION_ENTRADA_MS).toBe(2000);
    expect(faseIntro(0)).toBe("puerta");
    expect(faseIntro(puertaLista - 1)).toBe("puerta");
    expect(faseIntro(puertaLista)).toBe("entrando");
    expect(faseIntro(sentado - 1)).toBe("entrando");
    expect(faseIntro(sentado)).toBe("listo");
    expect(faseIntro(sentado + 5000)).toBe("listo");
  });

  it("mantiene la cámara en el pasillo hasta abrir, luego llega al asiento y se fija", () => {
    expect(posCamara(-500)).toEqual([0, 1.6, -7.2]);
    expect(posCamara(puertaLista - 1)).toEqual([0, 1.6, -7.2]);
    expect(posCamara(sentado)).toEqual([0, 1.25, 2.4]);
    expect(posCamara(sentado + 5000)).toEqual([0, 1.25, 2.4]);
    const z = Array.from({ length: 9 }, (_, i) => posCamara(puertaLista + (i * DURACION_ENTRADA_MS) / 8)[2]);
    for (let i = 1; i < z.length; i++) expect(z[i]).toBeGreaterThan(z[i - 1]);
  });

  it("mira primero al panel, avanza mirando al frente, y acaba girada hacia la puerta", () => {
    expect(objetivoCamara(0)).toEqual([0, 1.3, -3.9]);
    expect(objetivoCamara(puertaLista)).toEqual([0, 1.3, -3.9]);
    expect(objetivoCamara(puertaLista + DURACION_ENTRADA_MS / 2)).toEqual([0, 1.2, 2]);
    expect(objetivoCamara(sentado)).toEqual([0, 1.1, -4]);
    expect(objetivoCamara(sentado + 5000)).toEqual([0, 1.1, -4]);
  });

  it("entra con ease in-out asimétrico, no con traslación lineal", () => {
    const inicio = posCamara(puertaLista)[2];
    const fin = posCamara(sentado)[2];
    const medio = (posCamara(puertaLista + DURACION_ENTRADA_MS / 2)[2] - inicio) / (fin - inicio);
    expect(medio).toBeGreaterThan(0.3);
    expect(medio).toBeLessThan(0.7);
    expect(medio).not.toBe(0.5);
    const temprano = (posCamara(puertaLista + 200)[2] - inicio) / (fin - inicio);
    const tarde = (fin - posCamara(sentado - 200)[2]) / (fin - inicio);
    expect(temprano).toBeLessThan(0.1);
    expect(tarde).toBeLessThan(0.1);
  });
});

describe("webglDisponible (fallback S10)", () => {
  it("en Node (sin document) informa que no hay WebGL", () => {
    expect(webglDisponible()).toBe(false);
  });
});
