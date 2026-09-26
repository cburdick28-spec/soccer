import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Pocket Gaffer — Football Career Sim",
  description: "A browser-based football management career sim.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans">
        <NavBar />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
