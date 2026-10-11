import Link from "next/link";
import { Button } from "@/components/ui/button";

// Provisional: el panel en vivo se rehace en la fase 5 (usa /api/stats y /api/ranking).
export default function Panel() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-8">
      <h1 className="font-display text-4xl font-bold">Panel</h1>
      <p className="text-muted">Panel en construcción.</p>
      <Button asChild variant="outline" className="self-start">
        <Link href="/">Volver</Link>
      </Button>
    </main>
  );
}
