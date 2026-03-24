import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EXOTIC OS",
  description: "Terminal de Punto de Venta para Club Social",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-stone-950 text-stone-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
