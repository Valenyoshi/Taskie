"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function TaskieLoader() {
  const [kitty, setKitty] = useState(false);

  useEffect(() => {
    setKitty(Math.random() < 0.5);
  }, []);

  return (
    <div className="taskie-loader" role="status" aria-label="Cargando Taskie">
      <div className={`taskie-loader-logo ${kitty ? "is-kitty" : ""}`} aria-hidden>
        {kitty ? (
          <Image className="taskie-loader-kitty" src="/kitty-head.png" alt="" width={78} height={78} priority />
        ) : (
          <svg viewBox="0 0 96 96" width="72" height="72">
            <rect x="22" y="14" width="52" height="68" rx="7" fill="#fffaf0" stroke="#e8a317" strokeWidth="3" />
            <path className="taskie-loader-lines" d="M32 31h30M32 42h25M32 53h18" stroke="#e8d9bd" strokeWidth="3" strokeLinecap="round" />
            <path className="taskie-loader-pencil" d="m31 66 22-22 7 7-22 22-9 2z" fill="#e25b45" stroke="#a83b2c" strokeWidth="2" strokeLinejoin="round" />
            <path className="taskie-loader-pencil-tip" d="m29 75 2-9 7 7z" fill="#f5cd30" stroke="#a83b2c" strokeWidth="2" strokeLinejoin="round" />
            <path className="taskie-loader-check" d="m29 58 9 9 28-29" fill="none" stroke="#1c9b68" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="gradient-text font-display text-4xl">Taskie</span>
      <span className="mt-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Cargando
        <span className="taskie-loader-dots" aria-label="Cargando">
          <i />
          <i />
          <i />
        </span>
      </span>
    </div>
  );
}
