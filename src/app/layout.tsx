import type { Metadata, Viewport } from "next";
import { Fredoka, Inter } from "next/font/google";
import "./globals.css";

const fontDisplay = Fredoka({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const fontBody = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "Alerta Roja",
  description:
    "Un juego para descubrir qué tan confiable es una prueba positiva. Estima, decide y compara con la realidad.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f1218", // = --background
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <body>{children}</body>
    </html>
  );
}
