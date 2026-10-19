import Link from "next/link";
import { CampoApodo } from "@/components/game/CampoApodo";
import { StoryCards } from "@/components/game/story-cards";
import { TitularInicio } from "@/components/game/TitularInicio";
import { EnlaceMisInsignias } from "@/components/insignias/EnlaceMisInsignias";

// La portada no muestra la prevalencia ni el VPP reales: sesgaría la intuición del jugador.
export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 pt-14 pb-8">
      <TitularInicio />
      <StoryCards />
      <CampoApodo />
      <EnlaceMisInsignias />
      <Link href="/panel" className="touch-target self-center text-sm text-muted underline underline-offset-4">
        Ver el panel
      </Link>
    </main>
  );
}
