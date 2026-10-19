import { Lightbulb } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";

/** La misma cuenta que la ronda, en un caso cotidiano: 1 de cada 10 correos es basura. */
export function SabiasQue() {
  return (
    <Card className="flex items-start gap-3">
      <Lightbulb className="mt-1 size-6 shrink-0 text-warning" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-2">
        <CardTitle className="text-lg">Sabías que…</CardTitle>
        <p className="leading-relaxed">
          Los filtros de spam tienen el mismo problema. Si solo 1 de cada 10 correos es basura, y el filtro
          atrapa 9 de cada 10 basuras pero también marca 2 de cada 10 correos buenos, un correo marcado como
          spam es basura solo 1 de cada 3 veces. Por eso conviene revisar la carpeta antes de borrar.
        </p>
      </div>
    </Card>
  );
}
