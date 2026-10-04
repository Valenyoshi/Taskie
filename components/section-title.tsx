"use client";

import { usePathname } from "next/navigation";

export function SectionTitle() {
  const pathname = usePathname();
  let title = "Taskie";
  if (pathname.startsWith("/materias")) title = "Materias";
  else if (pathname.startsWith("/premios")) title = "Premios";
  else if (pathname.startsWith("/ranking")) title = "Ranking";
  else if (pathname.startsWith("/chat")) title = "Chat";

  return (
    <p className={`gradient-text font-display leading-none ${title === "Taskie" ? "text-6xl" : "text-5xl"}`}>
      {title}
    </p>
  );
}
