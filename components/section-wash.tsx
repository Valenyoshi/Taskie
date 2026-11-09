"use client";

import { usePathname } from "next/navigation";

function toneFor(pathname: string) {
  if (pathname.startsWith("/inicio")) return "inicio";
  if (pathname.startsWith("/materias")) return "materias";
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/eventos")) return "eventos";
  if (pathname.startsWith("/configuracion")) return "configuracion";
  if (pathname.startsWith("/ranking")) return "ranking";
  if (pathname.startsWith("/concentracion")) return "concentracion";
  return "";
}

export function SectionWash() {
  const tone = toneFor(usePathname());
  if (!tone) return null;
  return <div className={`section-wash ${tone}`} aria-hidden />;
}
