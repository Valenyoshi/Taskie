import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-app" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "task.ai",
  description: "Las tareas del colegio, con otro nivel.",
  manifest: "/manifest.webmanifest",
  applicationName: "task.ai",
  appleWebApp: { capable: true, title: "task.ai", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#8a4b16",
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${outfit.variable} ${fraunces.variable}`}>
      <body className="antialiased">
        {children}
        <p className="pointer-events-none fixed top-3 right-3 z-30 text-[11px] font-semibold tracking-wide text-muted-foreground">
          made by Valen
        </p>
      </body>
    </html>
  );
}
