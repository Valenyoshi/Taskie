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
          <svg viewBox="0 0 96 96" width="76" height="76">
            {/* Hoja de cuaderno con espiral y esquina doblada a mano */}
            <rect x="20" y="12" width="56" height="72" rx="6" fill="#fffaf2" stroke="#e8a317" strokeWidth="2.8" />
            <path d="M68 12l8 8h-8v-8z" fill="#f4dfb8" stroke="#e8a317" strokeWidth="1.6" />
            {/* Anillas superiores */}
            <ellipse cx="32" cy="12" rx="2.4" ry="4" fill="#a08544" />
            <ellipse cx="48" cy="12" rx="2.4" ry="4" fill="#a08544" />
            <ellipse cx="64" cy="12" rx="2.4" ry="4" fill="#a08544" />
            {/* Renglones escolares suaves */}
            <path className="taskie-loader-lines" d="M30 30h34M30 40h28M30 50h22" stroke="#e6cca2" strokeWidth="2.8" strokeLinecap="round" />
            {/* Lápiz escolar dibujado con virola y madera vista */}
            <path className="taskie-loader-pencil" d="m30 68 22-22 7 7-22 22-9 2z" fill="#e25b45" stroke="#9e281b" strokeWidth="2" strokeLinejoin="round" />
            <path className="taskie-loader-pencil-tip" d="m28 77 2-9 7 7z" fill="#f4dfb8" stroke="#9e281b" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="29.5" cy="75.5" r="1.4" fill="#2c241f" />
            {/* Check con trazo manuscrito y grosor cálido */}
            <path className="taskie-loader-check" d="m28 58 10 10 30-31" fill="none" stroke="#1c7c6e" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
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
