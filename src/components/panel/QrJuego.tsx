"use client";

import { useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/card";
import { urlJuego, urlLegible } from "@/lib/panel";

const sinSuscripcion = () => () => {};
const origenCliente = () => window.location.origin;
const origenServidor = () => "";

/** QR grande (corrección H, zona blanca) + URL legible, para escanear desde el proyector. */
export function QrJuego() {
  const origen = useSyncExternalStore(sinSuscripcion, origenCliente, origenServidor);
  const url = urlJuego(process.env.NEXT_PUBLIC_SITE_URL, origen);

  return (
    <Card className="flex flex-col items-center gap-3 p-4 sm:gap-4 sm:p-6">
      <h2 className="font-display text-2xl font-bold sm:text-4xl">Escanea para jugar</h2>
      <div className="w-full max-w-[15rem] rounded-xl bg-white p-3 sm:max-w-[22rem] sm:p-4">
        {url ? (
          <QRCodeSVG
            value={url}
            level="H"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#000000"
            className="h-auto w-full"
            title="Código QR para abrir el juego"
          />
        ) : (
          <div className="aspect-square w-full" aria-hidden="true" />
        )}
      </div>
      <p className="max-w-full text-center font-mono text-lg font-semibold break-all sm:text-2xl" data-testid="url-juego">
        {url ? urlLegible(url) : "…"}
      </p>
    </Card>
  );
}
