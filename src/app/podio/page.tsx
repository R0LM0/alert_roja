import type { Metadata } from "next";
import { PodioFeria } from "@/components/podio/PodioFeria";
import { logError } from "@/lib/api";
import { cierreFeria } from "@/lib/cierre";
import { claveValida } from "@/lib/clave";
import { armarPodio } from "@/lib/podio";
import { leerRankingTemporada } from "@/lib/ranking-consulta";
import { PREVALENCIA, PREVALENCIA_EXPERTO } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Podio — Alerta Roja",
  robots: { index: false, follow: false },
};

/** Una fila más que los 3 puestos: así se ve un empate entre el 3.º y el 4.º. */
const LIMITE_CORTE = 4;

type Props = { searchParams: Promise<{ key?: string | string[] }> };

/** Protegido como /api/export, pero sin clave configurada tampoco se muestra (los ganadores no son públicos). */
function SinAcceso() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-3 p-6 text-center">
      <h1 className="font-display text-3xl font-bold">401 · Acceso no autorizado</h1>
      <p className="text-lg text-muted">Falta o es incorrecta la clave del panel. Abre el podio con ?key=TU_CLAVE.</p>
    </main>
  );
}

export default async function PaginaPodio({ searchParams }: Props) {
  const { key } = await searchParams;
  const clave = Array.isArray(key) ? key[0] : key;
  if (!claveValida(clave, process.env.PANEL_KEY)) return <SinAcceso />;

  const cierre = cierreFeria();
  try {
    const [normal, experto] = await Promise.all([
      leerRankingTemporada({ prevalencia: PREVALENCIA, cierre, limite: LIMITE_CORTE }),
      leerRankingTemporada({ prevalencia: PREVALENCIA_EXPERTO, cierre, limite: LIMITE_CORTE }),
    ]);
    return <PodioFeria podio={armarPodio([...normal, ...experto])} cierre={cierre} />;
  } catch (e) {
    logError("GET /podio", e);
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-3 p-6 text-center">
        <h1 className="font-display text-3xl font-bold">No se pudo cargar el podio</h1>
        <p className="text-lg text-muted">Intenta recargar la página.</p>
      </main>
    );
  }
}
