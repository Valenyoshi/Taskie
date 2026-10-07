"use client";

import { usePathname } from "next/navigation";

export function SectionTitle() {
  const pathname = usePathname();
  let title = "Taskie";
  if (pathname.startsWith("/materias")) title = "Materias";
  else if (pathname.startsWith("/premios")) title = "Tienda de Bobby";
  else if (pathname.startsWith("/ranking")) title = "Ranking";
  else if (pathname.startsWith("/chat")) title = "Chat";
  else if (pathname.startsWith("/concentracion")) title = "Concentración";
  else if (pathname.startsWith("/configuracion")) title = "Configuración";

  return (
    <p
      className={`gradient-text font-display leading-none ${title === "Taskie" ? "text-6xl" : title.length > 12 ? "text-4xl sm:text-5xl" : "text-5xl"}`}
    >
      {title}
    </p>
  );
}
