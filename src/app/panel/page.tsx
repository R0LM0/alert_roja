import type { Metadata } from "next";
import { PanelEnVivo } from "@/components/panel/PanelEnVivo";

export const metadata: Metadata = { title: "Panel — Alerta Roja" };

type Props = { searchParams: Promise<{ key?: string | string[] }> };

export default async function PaginaPanel({ searchParams }: Props) {
  const { key } = await searchParams;
  const clave = Array.isArray(key) ? key[0] : key;
  return <PanelEnVivo clave={clave || undefined} />;
}
