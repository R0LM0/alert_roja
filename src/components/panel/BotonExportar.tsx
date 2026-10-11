"use client";

import { useState, type MouseEvent } from "react";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { urlExport } from "@/lib/panel";
import { cn } from "@/lib/utils";

const NOMBRE_XLSX = `alerta-roja-${new Date().toISOString().slice(0, 10)}.xlsx`;
const NOMBRE_CSV = NOMBRE_XLSX.replace(/\.xlsx$/, ".csv");
const MSG_SIN_CLAVE = "Falta la clave del panel (agrega ?key=… a la URL)";
const MSG_FALLO = "No se pudo exportar. Intenta de nuevo.";

type Props = { clave?: string };

/** Nombre del archivo según Content-Disposition, o el de respaldo. */
function nombreDescarga(cabecera: string | null, respaldo: string): string {
  return /filename="?([^";]+)"?/i.exec(cabecera ?? "")?.[1] ?? respaldo;
}

/**
 * Enlaces de descarga normales (anchor + download): Excel (principal) y CSV (secundario).
 * Al hacer clic se comprueba la respuesta para mostrar un mensaje claro si el servidor exige la clave (401/403).
 */
export function BotonExportar({ clave }: Props) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const hrefXlsx = urlExport(clave);
  const hrefCsv = urlExport(clave, "csv");

  async function descargar(e: MouseEvent<HTMLAnchorElement>, href: string, respaldo: string) {
    e.preventDefault();
    setMensaje(null);
    try {
      const r = await fetch(href, { cache: "no-store" });
      if (r.status === 401 || r.status === 403) return setMensaje(MSG_SIN_CLAVE);
      if (!r.ok) return setMensaje(MSG_FALLO);
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreDescarga(r.headers.get("content-disposition"), respaldo);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMensaje(MSG_FALLO);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        <a
          href={hrefXlsx}
          download={NOMBRE_XLSX}
          onClick={(e) => descargar(e, hrefXlsx, NOMBRE_XLSX)}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-h-14 text-xl 2xl:text-2xl")}
        >
          <Download aria-hidden="true" />
          Exportar Excel
        </a>
        <a
          href={hrefCsv}
          download={NOMBRE_CSV}
          onClick={(e) => descargar(e, hrefCsv, NOMBRE_CSV)}
          className="text-lg font-semibold text-muted underline underline-offset-4 hover:text-foreground"
        >
          CSV
        </a>
      </div>
      {mensaje ? (
        <p role="alert" className="max-w-sm text-right text-lg font-semibold text-warning">
          {mensaje}
        </p>
      ) : null}
    </div>
  );
}
