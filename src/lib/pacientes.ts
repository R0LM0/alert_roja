// Pacientes de ejemplo: nombres comunes en Nicaragua, ficticios y sin figuras públicas.

export const NOMBRES = [
  "Marlon", "Yaoska", "Darling", "Lester", "Xiomara", "Byron", "Scarleth", "Wilmer", "Ligia", "Engel",
  "Maycol", "Jazmina", "Freddy", "Karelia", "Orlando", "Melba", "Henry", "Ivania", "Josué", "Lucía",
] as const;

export const APELLIDOS = [
  "Cruz", "Mendoza", "Ruiz", "Zeledón", "Altamirano", "Lacayo", "Gutiérrez", "Blandón", "Espinoza", "Obando",
  "Montiel", "Talavera", "Pineda", "Rizo", "Cerda", "Baltodano", "Salgado", "Quintanilla", "Mairena", "Urbina",
] as const;

export type Paciente = { nombre: string; seed: string };

/** Hash FNV-1a de 32 bits: simple, estable y sin dependencias. */
function hash(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Generador pseudoaleatorio determinista (mulberry32). */
function generador(semilla: number): () => number {
  let a = semilla;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nombreCon(azar: () => number): string {
  const nombre = NOMBRES[Math.floor(azar() * NOMBRES.length)];
  const apellido = APELLIDOS[Math.floor(azar() * APELLIDOS.length)];
  return `${nombre} ${apellido}`;
}

/** Un paciente determinista a partir de una semilla. */
export function pacienteDeSemilla(seed: string): Paciente {
  return { nombre: nombreCon(generador(hash(seed))), seed };
}

/** Una ronda de `cantidad` pacientes sin nombres repetidos; misma semilla, mismo resultado. */
export function pacientesDeRonda(seed: string, cantidad = 10): Paciente[] {
  const max = NOMBRES.length * APELLIDOS.length;
  if (cantidad > max) throw new RangeError(`Máximo ${max} pacientes distintos`);
  const azar = generador(hash(seed));
  const usados = new Set<string>();
  const pacientes: Paciente[] = [];
  while (pacientes.length < cantidad) {
    const nombre = nombreCon(azar);
    if (usados.has(nombre)) continue;
    usados.add(nombre);
    pacientes.push({ nombre, seed: `${seed}:${pacientes.length}` });
  }
  return pacientes;
}
