import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI Sales Assistant untuk UMKM",
  description:
    "Asisten penjualan berbasis AI untuk membantu UMKM menjawab pelanggan dan menangkap lead.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only z-[100] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Lewati ke konten utama
        </a>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
