// Lista corta de groserías en español; se compara sin tildes, sin símbolos y en minúsculas.
const PALABRAS = [
  "puta",
  "puto",
  "mierda",
  "carajo",
  "verga",
  "pene",
  "culo",
  "pendejo",
  "pendeja",
  "cabron",
  "cabrona",
  "chinga",
  "joder",
  "coño",
  "marica",
  "maricon",
  "idiota",
  "imbecil",
  "estupido",
  "estupida",
  "zorra",
  "malparido",
  "hijueputa",
  "gonorrea",
  "nazi",
];

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]/g, "");
}

const NORMALIZADAS = PALABRAS.map(normalizar);

export function tieneGroseria(texto: string): boolean {
  const t = normalizar(texto);
  return NORMALIZADAS.some((p) => t.includes(p));
}
