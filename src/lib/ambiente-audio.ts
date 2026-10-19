/**
 * Motor de audio procedural (Web Audio). Un solo AudioContext compartido; todo se sintetiza
 * (osciladores y ruido), sin archivos. Sin Web Audio (SSR o navegador viejo) no hace nada.
 * Los nodos se desconectan al terminar; los temporizadores del ambiente se limpian al parar.
 */
import {
  DURACION_EFECTO_S,
  envolvente,
  esperaAzar,
  esperaLatido,
  dbAGanancia,
  FUNDIDO_ENTRADA_S,
  FUNDIDO_SALIDA_S,
  frecuenciaNota,
  NIVELES_AMBIENTE,
  NOTAS,
  puntosDucking,
  REF_EFECTO,
  sonidoAzar,
  tiemposPasos,
  type NombreSonido,
  type PuntoEnvolvente,
} from "./ambiente";

type VentanaAudio = Window & { webkitAudioContext?: typeof AudioContext };

interface Grafo {
  ctx: AudioContext;
  master: GainNode; // silencio global (preferencia guardada)
  efectos: GainNode; // bus de efectos de evento
  ducking: GainNode; // baja el ambiente mientras suena un efecto
  ambiente: GainNode; // bus del ambiente (entra aquí cada sesión)
  marron: AudioBuffer; // ruido marrón en bucle (tono de sala)
  blanco: AudioBuffer; // ruido blanco (roces, pasos, golpes)
}

let grafo: Grafo | null = null;
let silenciado = true;
let pestanaVigilada = false;

function crearContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as VentanaAudio).webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

/** Buffer de ruido. El marrón lleva fundido en los bordes para que el bucle no haga clic. */
function crearRuido(ctx: AudioContext, segundos: number, marron: boolean): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * segundos);
  const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  let ultimo = 0;
  for (let i = 0; i < n; i++) {
    const blanco = Math.random() * 2 - 1;
    if (marron) {
      ultimo = (ultimo + 0.02 * blanco) / 1.02;
      datos[i] = ultimo * 3.5;
    } else {
      datos[i] = blanco;
    }
  }
  if (marron) {
    const borde = Math.floor(ctx.sampleRate * 0.1);
    for (let i = 0; i < borde; i++) {
      datos[i] *= i / borde;
      datos[n - 1 - i] *= i / borde;
    }
  }
  return buffer;
}

function construirGrafo(ctx: AudioContext): Grafo {
  const master = ctx.createGain();
  master.gain.value = silenciado ? 0 : 1;
  master.connect(ctx.destination);

  const efectos = ctx.createGain();
  efectos.gain.value = 0.8;
  efectos.connect(master);

  const ducking = ctx.createGain();
  ducking.connect(master);

  const ambiente = ctx.createGain();
  ambiente.connect(ducking);

  return {
    ctx,
    master,
    efectos,
    ducking,
    ambiente,
    marron: crearRuido(ctx, 4, true),
    blanco: crearRuido(ctx, 1, false),
  };
}

/** Pausa el audio al ocultar la pestaña (menos trabajo en el celular) y lo reanuda al volver. */
function vigilarPestana(): void {
  if (pestanaVigilada || typeof document === "undefined") return;
  pestanaVigilada = true;
  document.addEventListener("visibilitychange", () => {
    const g = grafo;
    if (!g) return;
    if (document.hidden) void g.ctx.suspend().catch(() => {});
    else if (!silenciado) void g.ctx.resume().catch(() => {});
  });
}

function obtenerGrafo(): Grafo | null {
  if (grafo && grafo.ctx.state !== "closed") return grafo;
  const ctx = crearContexto();
  if (!ctx) {
    grafo = null;
    return null;
  }
  try {
    grafo = construirGrafo(ctx);
  } catch {
    grafo = null;
    return null;
  }
  vigilarPestana();
  return grafo;
}

/**
 * Llamar desde un gesto del usuario (pointerdown, touchend, tecla o el propio botón de sonido).
 * Crea o reanuda el contexto. iOS Safari exige el gesto, así que se desbloquea con un buffer mudo.
 */
export function activarAudio(): void {
  const g = obtenerGrafo();
  if (!g || g.ctx.state !== "suspended") return;
  void g.ctx.resume().catch(() => {});
  try {
    const mudo = g.ctx.createBufferSource();
    mudo.buffer = g.ctx.createBuffer(1, 1, g.ctx.sampleRate);
    mudo.connect(g.ctx.destination);
    mudo.onended = () => mudo.disconnect();
    mudo.start(0);
  } catch {
    // Sin desbloqueo extra: el resume basta en la mayoría de navegadores.
  }
}

/** Silencio global. Al activar sonido también intenta reanudar el contexto (es un gesto). */
export function fijarSilencio(valor: boolean): void {
  silenciado = valor;
  if (!valor) activarAudio();
  const g = grafo;
  if (g && g.ctx.state !== "closed") {
    g.master.gain.setTargetAtTime(valor ? 0 : 1, g.ctx.currentTime, 0.05);
  }
}

// ---------- Síntesis de bloques ----------

interface OpcionesTono {
  destino: AudioNode;
  tipo: OscillatorType;
  frecuencia: number;
  inicio: number; // instante absoluto (ctx.currentTime based)
  duracion: number;
  pico: number;
  ataque?: number;
}

function tono(ctx: AudioContext, o: OpcionesTono): void {
  const osc = ctx.createOscillator();
  osc.type = o.tipo;
  osc.frequency.value = o.frecuencia;
  const amp = ctx.createGain();
  rampear(amp.gain, envolvente(o.duracion, o.pico, o.ataque), o.inicio);
  osc.connect(amp).connect(o.destino);
  osc.start(o.inicio);
  osc.stop(o.inicio + o.duracion + 0.02);
  osc.onended = () => {
    osc.disconnect();
    amp.disconnect();
  };
}

interface OpcionesRuido {
  destino: AudioNode;
  buffer: AudioBuffer;
  tipoFiltro: BiquadFilterType;
  frecuencia: number;
  frecuenciaFinal?: number; // barrido del filtro (la puerta)
  q: number;
  inicio: number;
  duracion: number;
  pico: number;
  ataque?: number;
}

function rafagaRuido(ctx: AudioContext, o: OpcionesRuido): void {
  const fuente = ctx.createBufferSource();
  fuente.buffer = o.buffer;
  // Arranca en un punto al azar del buffer: cada ráfaga suena distinta.
  const maxInicio = Math.max(0, o.buffer.duration - o.duracion);
  const filtro = ctx.createBiquadFilter();
  filtro.type = o.tipoFiltro;
  filtro.Q.value = o.q;
  filtro.frequency.setValueAtTime(o.frecuencia, o.inicio);
  if (o.frecuenciaFinal !== undefined) {
    filtro.frequency.linearRampToValueAtTime(o.frecuenciaFinal, o.inicio + o.duracion);
  }
  const amp = ctx.createGain();
  rampear(amp.gain, envolvente(o.duracion, o.pico, o.ataque), o.inicio);
  fuente.connect(filtro).connect(amp).connect(o.destino);
  fuente.start(o.inicio, Math.random() * maxInicio, o.duracion + 0.02);
  fuente.onended = () => {
    fuente.disconnect();
    filtro.disconnect();
    amp.disconnect();
  };
}

/** Aplica una envolvente exponencial desde `inicio` (absoluto). */
function rampear(param: AudioParam, puntos: PuntoEnvolvente[], inicio: number): void {
  puntos.forEach((p, i) => {
    if (i === 0) param.setValueAtTime(p.v, inicio + p.t);
    else param.exponentialRampToValueAtTime(p.v, inicio + p.t);
  });
}

// ---------- Efectos de evento ----------

type Efecto = (g: Grafo, t: number) => void;

const EFECTOS: Record<NombreSonido, Efecto> = {
  click(g, t) {
    rafagaRuido(g.ctx, {
      destino: g.efectos,
      buffer: g.blanco,
      tipoFiltro: "bandpass",
      frecuencia: 2600,
      q: 2,
      inicio: t,
      duracion: 0.03,
      pico: 0.18,
      ataque: 0.002,
    });
  },

  // Puerta que se abre (barrido) y tres pasos suaves.
  llegada(g, t) {
    rafagaRuido(g.ctx, {
      destino: g.efectos,
      buffer: g.blanco,
      tipoFiltro: "bandpass",
      frecuencia: 300,
      frecuenciaFinal: 1400,
      q: 1.2,
      inicio: t,
      duracion: 0.6,
      pico: 0.2,
      ataque: 0.15,
    });
    for (const paso of tiemposPasos(3, t + 0.35, 0.25)) {
      rafagaRuido(g.ctx, {
        destino: g.efectos,
        buffer: g.blanco,
        tipoFiltro: "lowpass",
        frecuencia: 900,
        q: 0.7,
        inicio: paso,
        duracion: 0.08,
        pico: 0.3,
        ataque: 0.005,
      });
      tono(g.ctx, { destino: g.efectos, tipo: "sine", frecuencia: 95, inicio: paso, duracion: 0.09, pico: 0.12 });
    }
  },

  // Dos tonos suaves, descendentes: aviso, no alarma.
  aislar(g, t) {
    NOTAS.aislar.forEach((semi, i) =>
      tono(g.ctx, {
        destino: g.efectos,
        tipo: "triangle",
        frecuencia: frecuenciaNota(semi),
        inicio: t + i * 0.16,
        duracion: i === 0 ? 0.22 : 0.3,
        pico: 0.22,
        ataque: 0.012,
      }),
    );
  },

  // Campanilla agradable: dos notas, la segunda entra apenas después.
  liberar(g, t) {
    const [primera, segunda] = NOTAS.liberar;
    tono(g.ctx, { destino: g.efectos, tipo: "sine", frecuencia: frecuenciaNota(primera), inicio: t, duracion: 0.8, pico: 0.2 });
    tono(g.ctx, {
      destino: g.efectos,
      tipo: "sine",
      frecuencia: frecuenciaNota(segunda),
      inicio: t + 0.12,
      duracion: 0.9,
      pico: 0.16,
    });
  },

  // Arpegio ascendente de cierre de ronda; la última nota sostiene.
  resultado(g, t) {
    NOTAS.resultado.forEach((semi, i) => {
      const ultima = i === NOTAS.resultado.length - 1;
      tono(g.ctx, {
        destino: g.efectos,
        tipo: "triangle",
        frecuencia: frecuenciaNota(semi),
        inicio: t + i * 0.09,
        duracion: ultima ? 0.75 : 0.35,
        pico: 0.2,
        ataque: 0.008,
      });
    });
  },

  // Destello: notas agudas muy cortas.
  insignia(g, t) {
    NOTAS.insignia.forEach((semi, i) =>
      tono(g.ctx, {
        destino: g.efectos,
        tipo: "sine",
        frecuencia: frecuenciaNota(semi),
        inicio: t + i * 0.055,
        duracion: 0.2,
        pico: 0.12,
        ataque: 0.004,
      }),
    );
  },
};

/** Baja el ambiente durante un efecto: reprograma la envolvente de ducking desde el valor actual. */
function duckear(g: Grafo, duracion: number): void {
  const { ctx, ducking } = g;
  const t = ctx.currentTime;
  ducking.gain.cancelScheduledValues(t);
  ducking.gain.setValueAtTime(ducking.gain.value, t);
  for (const p of puntosDucking(duracion).slice(1)) {
    ducking.gain.linearRampToValueAtTime(p.v, t + p.t);
  }
}

/** Reproduce un efecto de evento. No hace nada en silencio, sin contexto o sin gesto previo. */
export function reproducir(nombre: NombreSonido): void {
  const g = grafo;
  if (silenciado || !g || g.ctx.state !== "running") return;
  try {
    EFECTOS[nombre](g, g.ctx.currentTime);
    if (nombre !== "click") duckear(g, DURACION_EFECTO_S[nombre]);
  } catch {
    // Audio opcional: nunca rompe el juego.
  }
}

// ---------- Ambiente de consultorio ----------

/**
 * Arranca el ambiente (tono de sala, latido del monitor y sonidos de azar). Devuelve la
 * función que lo detiene con un fundido corto. Sin contexto o en silencio no hace nada.
 */
export function iniciarAmbiente(aleatorio: () => number = Math.random): () => void {
  const g = obtenerGrafo();
  if (!g || silenciado) return () => {};
  const { ctx } = g;
  const ref = REF_EFECTO;
  const nivel = (db: number) => ref * dbAGanancia(db);

  // Sesión propia: su fundido de entrada/salida no afecta a otra sesión.
  const sesion = ctx.createGain();
  const t0 = ctx.currentTime;
  sesion.gain.setValueAtTime(0, t0);
  sesion.gain.linearRampToValueAtTime(1, t0 + FUNDIDO_ENTRADA_S);
  sesion.connect(g.ambiente);

  const fuente = ctx.createBufferSource();
  fuente.buffer = g.marron;
  fuente.loop = true;
  const sala = ctx.createBiquadFilter();
  sala.type = "lowpass";
  sala.frequency.value = 420;
  const sonidoSala = ctx.createGain();
  sonidoSala.gain.value = nivel(NIVELES_AMBIENTE.sala);
  fuente.connect(sala).connect(sonidoSala).connect(sesion);
  fuente.start(t0);

  let activa = true;
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const programar = (ms: number, accion: () => void) => {
    temporizador = setTimeout(() => {
      if (activa) accion();
    }, ms);
  };
  const sonando = () => ctx.state === "running";

  const latir = () => {
    if (sonando()) {
      tono(ctx, {
        destino: sesion,
        tipo: "sine",
        frecuencia: 1000,
        inicio: ctx.currentTime,
        duracion: 0.09,
        pico: nivel(NIVELES_AMBIENTE.latido),
        ataque: 0.008,
      });
    }
    programar(esperaLatido(aleatorio), latir);
  };

  const azar = () => {
    if (sonando()) {
      const t = ctx.currentTime;
      if (sonidoAzar(aleatorio) === "roce") {
        rafagaRuido(ctx, {
          destino: sesion,
          buffer: g.blanco,
          tipoFiltro: "bandpass",
          frecuencia: 3500,
          q: 0.9,
          inicio: t,
          duracion: 0.18,
          pico: nivel(NIVELES_AMBIENTE.azar),
          ataque: 0.04,
        });
      } else {
        for (const paso of tiemposPasos(2, t, 0.3)) {
          rafagaRuido(ctx, {
            destino: sesion,
            buffer: g.blanco,
            tipoFiltro: "lowpass",
            frecuencia: 260,
            q: 0.7,
            inicio: paso,
            duracion: 0.14,
            pico: nivel(NIVELES_AMBIENTE.azar),
            ataque: 0.01,
          });
        }
      }
    }
    programar(esperaAzar(aleatorio), azar);
  };

  programar(esperaLatido(aleatorio), latir);
  programar(esperaAzar(aleatorio) / 2, azar);

  return () => {
    if (!activa) return;
    activa = false;
    clearTimeout(temporizador);
    const t = ctx.currentTime;
    sesion.gain.cancelScheduledValues(t);
    sesion.gain.setValueAtTime(sesion.gain.value, t);
    sesion.gain.linearRampToValueAtTime(0, t + FUNDIDO_SALIDA_S);
    // Desconexión al terminar el fundido: sin temporizador extra.
    fuente.onended = () => {
      fuente.disconnect();
      sala.disconnect();
      sonidoSala.disconnect();
      sesion.disconnect();
    };
    fuente.stop(t + FUNDIDO_SALIDA_S + 0.05);
  };
}
