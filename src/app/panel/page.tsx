import type { Metadata } from "next";
import { PanelEnVivo } from "@/components/panel/PanelEnVivo";
import { esRevelarActivo } from "@/lib/panel";

export const metadata: Metadata = { title: "Panel — Alerta Roja" };

type Props = { searchParams: Promise<{ key?: string | string[]; revelar?: string | string[] }> };

export default async function PaginaPanel({ searchParams }: Props) {
  const { key, revelar } = await searchParams;
  const clave = Array.isArray(key) ? key[0] : key;
  const valorRevelar = Array.isArray(revelar) ? revelar[0] : revelar;
  return <PanelEnVivo clave={clave || undefined} revelarInicial={esRevelarActivo(valorRevelar)} />;
}
