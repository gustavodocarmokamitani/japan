import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Viagem ao Japão 🇯🇵",
  description: "Álbum de fotos da nossa viagem ao Japão, para compartilhar com a galera.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`dark ${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0d0d0d] text-white">
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
