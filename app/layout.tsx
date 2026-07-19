import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MecDigital | Consulta de protocolo",
  description: "Consulte informações institucionais com seu protocolo MecDigital."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
