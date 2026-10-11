export function PixelCheck({ className = "" }: { className?: string }) {
  return (
    <svg className={`pixel-check ${className}`} viewBox="0 0 64 48" aria-hidden>
      {/* Check con estética de píxeles dibujados a mano, bloques con bordes suaves que parecen de bordado o cuadrícula */}
      <path
        fill="currentColor"
        d="M6 22h8v8H6zM14 30h8v8h-8zM22 36h8v8h-8zM30 30h8v8h-8zM38 22h8v8h-8zM46 14h8v8h-8zM54 6h8v8h-8z"
      />
      {/* Sombra de apoyo de cada píxel para darle cuerpo real de ficha */}
      <path
        fill="#000"
        fillOpacity="0.18"
        d="M6 30h8v2H6zM14 38h8v2h-8zM22 44h8v2h-8zM30 38h8v2h-8zM38 30h8v2h-8zM46 22h8v2h-8zM54 14h8v2h-8z"
      />
      {/* Brillo superior tipo gema de videojuego artesanal */}
      <path
        fill="#fff"
        fillOpacity="0.35"
        d="M7 23h6v2H7zM15 31h6v2h-6zM23 37h6v2h-6zM31 31h6v2h-6zM39 23h6v2h-6zM47 15h6v2h-6zM55 7h6v2h-6z"
      />
    </svg>
  );
}
