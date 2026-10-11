"use client";

import { useState, type MouseEvent } from "react";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { urlExport } from "@/lib/panel";
import { cn } from "@/lib/utils";

const NOMBRE_ARCHIVO = "alerta-roja.csv";
const MSG_SIN_CLAVE = "Falta la clave del panel (agrega ?key=… a la URL)";
const MSG_FALLO = "No se pudo exportar. Intenta de nuevo.";

type Props = { clave?: string };

/**
 * Enlace de descarga normal (anchor + download). Al hacer clic se comprueba la respuesta
 * para mostrar un mensaje claro si el servidor exige la clave (401/403).
 */
export function BotonExportar({ clave }: Props) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const href = urlExport(clave);

  async function alHacerClic(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setMensaje(null);
    try {
      const r = await fetch(href, { cache: "no-store" });
      if (r.status === 401 || r.status === 403) return setMensaje(MSG_SIN_CLAVE);
      if (!r.ok) return setMensaje(MSG_FALLO);
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = NOMBRE_ARCHIVO;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMensaje(MSG_FALLO);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <a
        href={href}
        download={NOMBRE_ARCHIVO}
        onClick={alHacerClic}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-h-14 text-xl 2xl:text-2xl")}
      >
        <Download aria-hidden="true" />
        Exportar CSV
      </a>
      {mensaje ? (
        <p role="alert" className="max-w-sm text-right text-lg font-semibold text-warning">
          {mensaje}
        </p>
      ) : null}
    </div>
  );
}
