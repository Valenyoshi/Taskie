"use client";

import { usePathname } from "next/navigation";

export function SectionWash() {
  const pathname = usePathname();
  let tone = "";
  if (pathname.startsWith("/materias")) tone = "materias";
  else if (pathname.startsWith("/premios")) tone = "tienda";
  else if (pathname.startsWith("/ranking")) tone = "ranking";
  else if (pathname.startsWith("/chat")) tone = "chat";
  if (!tone) return null;

  return (
    <div className={`section-wash ${tone}`} aria-hidden>
      {tone === "tienda" ? (
        <>
          <span className="wash-blob a" />
          <span className="wash-blob b" />
          <span className="wash-blob c" />
          <span className="wash-blob d" />
        </>
      ) : null}
    </div>
  );
}
