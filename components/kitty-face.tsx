import React from "react";

export function KittyFace({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Sombra suave y cálida */}
        <filter id="kitty-face-shadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#4a2810" floodOpacity="0.16" />
        </filter>
        {/* Gradiente blanco-suave con volumen de malvavisco */}
        <radialGradient id="kitty-face-head" cx="44%" cy="36%" r="62%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f7f9fd" />
          <stop offset="100%" stopColor="#e3ebf6" />
        </radialGradient>
        {/* Interior rosado tierno de las orejas */}
        <linearGradient id="kitty-face-ear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffaec2" />
          <stop offset="100%" stopColor="#f07293" />
        </linearGradient>
      </defs>

      <g filter="url(#kitty-face-shadow)">
        {/* Oreja izquierda con ángulo idéntico a Kitty original */}
        <path
          d="M20 45 C14 30, 15 15, 24 11 C32 17, 35 27, 36 35 Z"
          fill="#f1f5fa"
          stroke="#c5d3e3"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M21.5 40 C17 28, 18 17.5, 24 14.5 C29.5 19, 31.8 26.5, 32.5 32 Z"
          fill="url(#kitty-face-ear)"
        />

        {/* Oreja derecha */}
        <path
          d="M80 45 C86 30, 85 15, 76 11 C68 17, 65 27, 64 35 Z"
          fill="#f1f5fa"
          stroke="#c5d3e3"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M78.5 40 C83 28, 82 17.5, 76 14.5 C70.5 19, 68.2 26.5, 67.5 32 Z"
          fill="url(#kitty-face-ear)"
        />

        {/* Cabeza cuadrada-redondeada característica de Kitty */}
        <path
          d="M25 36
             C36 32, 64 32, 75 36
             C84 44, 85 64, 80 81
             C72 87, 28 87, 20 81
             C15 64, 16 44, 25 36 Z"
          fill="url(#kitty-face-head)"
          stroke="#c5d3e3"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Brillo suave superior */}
        <ellipse cx="44" cy="38" rx="15" ry="4" fill="#ffffff" fillOpacity="0.9" />

        {/* Ojos redondos negros simpáticos */}
        <circle cx="41" cy="57" r="4.8" fill="#1b2029" />
        <circle cx="39.6" cy="55.6" r="1.5" fill="#ffffff" />

        <circle cx="59" cy="57" r="4.8" fill="#1b2029" />
        <circle cx="57.6" cy="55.6" r="1.5" fill="#ffffff" />

        {/* Mejillas sonrojadas delicadas */}
        <ellipse cx="30" cy="66" rx="5" ry="3" fill="#ffb4c6" fillOpacity="0.55" />
        <ellipse cx="70" cy="66" rx="5" ry="3" fill="#ffb4c6" fillOpacity="0.55" />

        {/* Boca en :3 clásica */}
        <path
          d="M41 68
             C41 76.5, 48.5 76.5, 50 71.5
             C51.5 76.5, 59 76.5, 59 68"
          stroke="#1b2029"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
