"use client";

import { useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";

function toneFor(pathname: string) {
  if (pathname.startsWith("/inicio")) return "inicio";
  if (pathname.startsWith("/materias")) return "materias";
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/apuntes")) return "apuntes";
  if (pathname.startsWith("/configuracion")) return "configuracion";
  if (pathname.startsWith("/ranking")) return "ranking";
  if (pathname.startsWith("/concentracion")) return "concentracion";
  return "";
}

export function SectionWash() {
  const pathname = usePathname();
  const tone = toneFor(pathname);
  const [variant, setVariant] = useState(1);

  useLayoutEffect(() => {
    if (!tone) return;
    setVariant(1 + Math.floor(Math.random() * 4));
  }, [tone]);

  if (!tone) return null;

  return <div className={`section-wash ${tone} v${variant}`} aria-hidden />;
}
