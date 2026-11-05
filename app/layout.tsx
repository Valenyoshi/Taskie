import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit, Patrick_Hand } from "next/font/google";
import { NavigationLoader } from "@/components/navigation-loader";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-app" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const hand = Patrick_Hand({ subsets: ["latin"], weight: "400", variable: "--font-hand" });

export const metadata: Metadata = {
  title: "Taskie",
  description: "Taskie, tu compañero de clases, que conecta con todo.",
  manifest: "/manifest.webmanifest",
  applicationName: "Taskie",
  appleWebApp: { capable: true, title: "Taskie", statusBarStyle: "default" },
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
    <html lang="es" className={`${outfit.variable} ${fraunces.variable} ${hand.variable}`}>
      <body className="antialiased">
        {children}
        <NavigationLoader />
        <p className="pointer-events-none fixed top-3 right-3 z-50 text-[11px] font-semibold tracking-wide text-muted-foreground">
          made by Valen
        </p>
      </body>
    </html>
  );
}
