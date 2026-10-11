"use client";

import { useState } from "react";
import { DoorOpen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Termometro } from "@/components/game/termometro";
import { CuentaRegresiva } from "@/components/game/cuenta-regresiva";

// Provisional: demo del termómetro y los botones de decisión (fase 3 los reemplaza).
export function KitDemo() {
  const [valor, setValor] = useState(30);
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <h2 className="font-display text-xl font-semibold">Tu estimación</h2>
        <CuentaRegresiva segundos={15} restantes={11} />
      </div>
      <Termometro value={valor} onChange={setValor} />
      <div className="grid grid-cols-2 gap-3">
        <Button variant="warning" size="lg">
          <Lock aria-hidden="true" /> Aislar
        </Button>
        <Button variant="success" size="lg">
          <DoorOpen aria-hidden="true" /> Liberar
        </Button>
      </div>
    </Card>
  );
}
