"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

export function SectionTitle() {
  const pathname = usePathname();
  let title = "Taskie";
  if (pathname.startsWith("/materias")) title = "Materias";
  else if (pathname.startsWith("/premios")) title = "Tienda de Kitty";
  else if (pathname.startsWith("/chat")) title = "IA";
  else if (pathname.startsWith("/configuracion")) title = "Configuración";

  return (
    title === "Taskie" ? (
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
    ) : (
      <p
        className={`gradient-text font-display leading-none ${title.length > 12 ? "text-4xl sm:text-5xl" : "text-5xl"}`}
      >
        {title}
      </p>
    )
  );
}
