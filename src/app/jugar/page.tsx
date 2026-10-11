import type { Metadata } from "next";
import { Turno } from "./Turno";

export const metadata: Metadata = { title: "Tu turno · Alerta Roja" };

type Props = { searchParams: Promise<{ modo?: string | string[] }> };

export default async function PaginaJugar({ searchParams }: Props) {
  const { modo } = await searchParams;
  return <Turno modo={modo === "experto" ? "experto" : "normal"} />;
}
