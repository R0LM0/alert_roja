import type { Metadata } from "next";
import { MisInsignias } from "@/components/insignias/MisInsignias";

export const metadata: Metadata = {
  title: "Mis insignias — Alerta Roja",
};

export default function PaginaMisInsignias() {
  return <MisInsignias />;
}
