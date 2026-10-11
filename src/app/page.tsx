import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PatientAvatar } from "@/components/game/patient-avatar";
import { PositivoStamp } from "@/components/game/positivo-stamp";
import { ProgresoPacientes } from "@/components/game/progreso-pacientes";
import { StoryCards } from "@/components/game/story-cards";
import { Leyenda } from "@/components/game/leyenda";
import { GuardadoEstado } from "@/components/game/guardado-estado";
import { KitDemo } from "@/components/game/kit-demo";

// Provisional: muestra el kit de diseño. La home real se hace en la fase 3.
export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Badge variant="danger" className="self-start">Kit de diseño</Badge>
        <h1 className="font-display text-5xl font-bold">Alerta Roja</h1>
        <p className="text-lg text-muted">Un positivo no siempre significa estar enfermo.</p>
      </header>

      <StoryCards />

      <Card className="flex flex-col items-center gap-3 text-center">
        <PatientAvatar seed="demo:0" name="Marlon Cruz" />
        <CardTitle>Marlon Cruz</CardTitle>
        <PositivoStamp />
        <ProgresoPacientes actual={3} total={10} className="w-full" />
      </Card>

      <KitDemo />

      <Card className="flex flex-col gap-4">
        <CardTitle>Leyenda</CardTitle>
        <Leyenda grupo="VP" cantidad={90} />
        <Leyenda grupo="FP" cantidad={180} />
        <Leyenda grupo="FN" cantidad={10} />
        <Leyenda grupo="VN" cantidad={720} />
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle>Estados</CardTitle>
        <CardDescription>Guardado de la partida</CardDescription>
        <div className="flex gap-2">
          <GuardadoEstado guardado />
          <GuardadoEstado guardado={false} />
        </div>
        <Input id="apodo" label="Tu apodo" hint="De 1 a 20 caracteres" placeholder="Ej. Dra. Lucía" />
        <Input id="apodo-error" label="Apodo con error" defaultValue="" error="Escribe un apodo" />
      </Card>

      <div className="flex flex-col gap-3">
        <Button size="xl">¡Empezar turno!</Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/panel">Ver panel</Link>
        </Button>
      </div>
    </main>
  );
}
