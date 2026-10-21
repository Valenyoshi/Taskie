"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

export function SectionTitle({ username }: { username: string }) {
  const pathname = usePathname();
  const home = pathname === "/inicio" || pathname.startsWith("/inicio/");
  let title = "";
  if (home) title = "Taskie";
  else if (pathname.startsWith("/materias")) title = "Materias";
  else if (pathname.startsWith("/premios")) title = "Temas";
  else if (pathname.startsWith("/chat")) title = "IA";
  else if (pathname.startsWith("/configuracion")) title = "Configuración";
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
        <p className="gradient-text mt-2 font-display text-4xl leading-none">Hola {username}</p>
      </>
    );
  }

  return (
    <p className={`gradient-text font-display leading-none ${title.length > 12 ? "text-4xl sm:text-5xl" : "text-5xl"}`}>
      {title}
    </p>
  );
}
