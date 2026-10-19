"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apodoRecordado, leerInsignias } from "@/lib/sesion-juego";

/** Acceso a /mis-insignias desde el inicio, con cuántas insignias tiene el apodo recordado. */
export function EnlaceMisInsignias() {
  const [cuenta, setCuenta] = useState(0);

  useEffect(() => {
    setCuenta(leerInsignias(apodoRecordado()).length);
  }, []);

  return (
    <Button asChild variant="outline" className="self-center">
      <Link href="/mis-insignias">
        <Award aria-hidden="true" />
        Mis insignias
        {cuenta > 0 ? <Badge variant="warning">{cuenta}</Badge> : null}
      </Link>
    </Button>
  );
}
