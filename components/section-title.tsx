"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

export function SectionTitle({ username }: { username: string }) {
  const pathname = usePathname();
  const home = pathname === "/inicio" || pathname.startsWith("/inicio/");
  let title = "";
  let tone = "";
  if (home) title = "Taskie";
  else if (pathname.startsWith("/materias")) {
    title = "Materias";
    tone = "materias";
  } else if (pathname.startsWith("/chat")) {
    title = "IA";
    tone = "chat";
  } else if (pathname.startsWith("/eventos")) {
    title = "Eventos";
    tone = "eventos";
  } else if (pathname.startsWith("/configuracion")) {
    title = "Configuración";
    tone = "configuracion";
  }
  if (!title) return null;

  if (title === "Taskie") {
    return (
      <>
        <div className="taskie-brand">
          <Image
            src="/kitty.png"
            alt=""
            width={373}
            height={668}
            className="taskie-brand-kitty"
            priority
          />
          <p className="gradient-text font-display text-6xl leading-none">{title}</p>
        </div>
        <p className="mt-2 font-display text-4xl leading-none">Hola {username}</p>
      </>
    );
  }

  const toneClass =
    tone === "materias"
      ? "section-title-materias"
      : tone === "chat"
        ? "section-title-chat"
        : tone === "configuracion"
          ? "section-title-configuracion"
          : tone === "eventos"
            ? "section-title-eventos"
            : "";
  return (
    <p className={`${toneClass} font-display leading-none ${title.length > 12 ? "text-4xl sm:text-5xl" : "text-5xl"}`}>
      {title}
    </p>
  );
}
