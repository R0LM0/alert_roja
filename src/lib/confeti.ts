import confetti from "canvas-confetti";

/** Lee un token de color desde :root (globals.css es la única fuente). */
export function leerTokenCss(nombre: string, alternativa: string): string {
  try {
    if (typeof document === "undefined") return alternativa;
    const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
    return valor === "" ? alternativa : valor;
  } catch {
    return alternativa;
  }
}

/** Paleta del tema para efectos (confeti, 3D). */
export function coloresTema(): { primary: string; success: string; warning: string; info: string } {
  return {
    primary: leerTokenCss("--primary", "#dc2626"),
    success: leerTokenCss("--success", "#22c55e"),
    warning: leerTokenCss("--warning", "#f59e0b"),
    info: leerTokenCss("--info", "#60a5fa"),
  };
}

/**
 * Lluvia de confeti con los colores del tema. `origen` va en fracciones de la pantalla (0 a 1); por defecto, abajo al centro.
 * No hace nada si el usuario prefiere movimiento reducido.
 */
export function festejar(origen: { x: number; y: number } = { x: 0.5, y: 0.6 }): void {
  try {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = coloresTema();
    void confetti({
      particleCount: 120,
      spread: 75,
      origin: origen,
      colors: [t.primary, t.success, t.warning, t.info, "#ffffff"],
      disableForReducedMotion: true,
    });
  } catch {
    // Efecto opcional: nunca rompe el juego.
  }
}
