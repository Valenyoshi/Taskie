export function HatIcon({ size = 42 }: { size?: number }) {
  return (
    <svg className="points-coin" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <ellipse cx="32" cy="48" rx="15" ry="8" fill="#1a1410" />
      <ellipse cx="32" cy="44" rx="15" ry="8.5" fill="#2c241f" />
      <path d="M8 30.5 32 17l24 13.5L32 44Z" fill="#1a1410" />
      <path d="M8 30.5 32 17v27Z" fill="#3a312b" />
      <path d="M16 29 32 20.5 46 29" fill="none" stroke="#6d6258" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="32" cy="30.5" r="3.6" fill="#f6c445" />
      <circle cx="32" cy="30.5" r="2.3" fill="#e8a317" />
      <path
        d="M34 32c6.5 3.2 11.5 8.2 13.5 15"
        fill="none"
        stroke="#e8a317"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M45.5 49.5c2.2 0 4.2 1.5 4.2 3.4 0 2.6-2.4 4.7-4.2 6-1.8-1.3-4.2-3.4-4.2-6 0-1.9 2-3.4 4.2-3.4Z" fill="#f6c445" />
    </svg>
  );
}

export function SchoolIcon({ id, size = 48 }: { id: string; size?: number }) {
  const box = { width: size, height: size, viewBox: "0 0 64 64", "aria-hidden": true as const };
  switch (id) {
    case "lapiz":
      return (
        <svg {...box}>
          <path d="M30 6h8l2 10H28L30 6z" fill="#f2b6c6" stroke="#c47b90" strokeWidth="2" />
          <rect x="27" y="16" width="14" height="30" rx="1" fill="#f6c445" stroke="#c4922a" strokeWidth="2" />
          <path d="M27 46h14l-7 14-7-14z" fill="#f4e2c4" stroke="#c4922a" strokeWidth="2" />
          <path d="M31 54h6l-3 6-3-6z" fill="#3f3a36" />
        </svg>
      );
    case "regla":
      return (
        <svg {...box}>
          <rect x="8" y="22" width="48" height="16" rx="2" fill="#e7c48a" stroke="#b8884a" strokeWidth="2" />
          {[14, 22, 30, 38, 46].map((x) => (
            <path key={x} d={`M${x} 22v8`} stroke="#8a6230" strokeWidth="2" />
          ))}
        </svg>
      );
    case "clip":
      return (
        <svg {...box}>
          <path
            d="M26 12c-8 0-12 6-12 12v16c0 8 6 14 14 14s12-5 12-12V22c0-5-3-8-7-8s-7 3-7 8v16"
            fill="none"
            stroke="#9aa3ad"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "crayon":
      return (
        <svg {...box}>
          <path d="M24 8h16l4 12H20L24 8z" fill="#ef6b4a" />
          <rect x="20" y="20" width="24" height="28" rx="2" fill="#f27d5a" stroke="#c44b32" strokeWidth="2" />
          <path d="M20 48h24l-12 10L20 48z" fill="#f4d7a1" stroke="#c44b32" strokeWidth="2" />
        </svg>
      );
    case "cuaderno":
      return (
        <svg {...box}>
          <rect x="16" y="8" width="34" height="48" rx="3" fill="#f7f1e4" stroke="#c9b89a" strokeWidth="2" />
          <path d="M16 16h8M16 24h8M16 32h8M16 40h8M16 48h8" stroke="#d7c7ae" strokeWidth="3" />
          {[20, 28, 36, 44].map((y) => (
            <path key={y} d={`M28 ${y}h16`} stroke="#d9cfc0" strokeWidth="2" />
          ))}
        </svg>
      );
    case "goma":
      return (
        <svg {...box}>
          <rect x="14" y="22" width="36" height="20" rx="4" fill="#f3a7b5" stroke="#d67b8e" strokeWidth="2" />
          <path d="M14 30h36" stroke="#e58ea0" strokeWidth="3" />
          <rect x="38" y="22" width="12" height="20" rx="3" fill="#7eb6e0" />
        </svg>
      );
    case "mochila":
      return (
        <svg {...box}>
          <path d="M24 16c0-6 16-6 16 0" fill="none" stroke="#245c46" strokeWidth="3" />
          <rect x="16" y="18" width="32" height="36" rx="8" fill="#2f6b4f" stroke="#1d4634" strokeWidth="2" />
          <rect x="22" y="30" width="20" height="14" rx="3" fill="#3e8664" stroke="#1d4634" strokeWidth="2" />
          <path d="M28 18v-4h8v4" fill="none" stroke="#f2c14e" strokeWidth="3" />
        </svg>
      );
    case "tubo":
      return (
        <svg {...box}>
          <rect x="26" y="8" width="12" height="8" rx="2" fill="#d7dee6" stroke="#8ea0b3" strokeWidth="2" />
          <path d="M28 16h8v24c0 8-8 14-8 14s-8-6-8-14V16h8z" fill="#e8f4ff" stroke="#7aa0c4" strokeWidth="2" />
          <path d="M22 34h12v6c0 6-6 10-6 10s-6-4-6-10v-6z" fill="#4aa3e0" />
        </svg>
      );
    case "abaco":
      return (
        <svg {...box}>
          <rect x="12" y="10" width="40" height="44" rx="4" fill="#c9843a" stroke="#8a5a22" strokeWidth="2" />
          {[22, 32, 42].map((y) => (
            <g key={y}>
              <path d={`M16 ${y}h32`} stroke="#5c3b16" strokeWidth="2" />
              <circle cx="24" cy={y} r="4" fill="#e24b4b" />
              <circle cx="34" cy={y} r="4" fill="#f2c14e" />
              <circle cx="44" cy={y} r="4" fill="#3d8f6e" />
            </g>
          ))}
        </svg>
      );
    case "paleta":
      return (
        <svg {...box}>
          <path d="M18 34c0-14 12-24 26-20 10 3 14 16 8 26-4 8-14 12-22 8-6-3-12-6-12-14z" fill="#f4e7d4" stroke="#c9b49a" strokeWidth="2" />
          <circle cx="24" cy="26" r="4" fill="#e24b4b" />
          <circle cx="34" cy="20" r="4" fill="#f2c14e" />
          <circle cx="42" cy="28" r="4" fill="#3d8f6e" />
          <circle cx="36" cy="38" r="4" fill="#3b6fd6" />
          <circle cx="30" cy="34" r="3" fill="#f7f1e8" />
        </svg>
      );
    case "libro":
      return (
        <svg {...box}>
          <path d="M12 14h18c4 0 6 2 6 4v32c-4-2-8-2-12-1H12V14z" fill="#3d8f6e" stroke="#245c46" strokeWidth="2" />
          <path d="M52 14H34c-4 0-6 2-6 4v32c4-2 8-2 12-1h12V14z" fill="#2f6b4f" stroke="#245c46" strokeWidth="2" />
          <path d="M32 18v32" stroke="#f2c14e" strokeWidth="2" />
        </svg>
      );
    case "copa":
      return (
        <svg {...box}>
          <path d="M18 14h28l-3 16c-1 8-6 14-11 14s-10-6-11-14L18 14z" fill="#f2c14e" stroke="#c4922a" strokeWidth="2" />
          <path d="M32 44v8M24 54h16" stroke="#c4922a" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 20h20" stroke="#fff6d2" strokeWidth="2" />
        </svg>
      );
    case "globo":
      return (
        <svg {...box}>
          <circle cx="32" cy="26" r="16" fill="#7eb6e0" stroke="#3b6ea5" strokeWidth="2" />
          <path d="M32 10v32M16 26h32M20 16c6 4 8 12 8 20M44 16c-6 4-8 12-8 20" fill="none" stroke="#2f6b4f" strokeWidth="2" />
          <path d="M32 42v6M24 52h16" stroke="#8a6230" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "microscopio":
      return (
        <svg {...box}>
          <rect x="28" y="8" width="8" height="14" rx="3" fill="#4b5563" />
          <circle cx="32" cy="28" r="8" fill="#d7dee6" stroke="#4b5563" strokeWidth="2" />
          <path d="M32 36v8M18 50h28M22 44h20" stroke="#4b5563" strokeWidth="3" strokeLinecap="round" />
          <path d="M40 30h10l-2 8h-6" fill="#e24b4b" />
        </svg>
      );
    case "manzana":
      return (
        <svg {...box}>
          <path d="M32 16c2-6 8-8 10-6" fill="none" stroke="#2f6b4f" strokeWidth="2" />
          <path d="M32 18c-2-4-8-4-8-1 4 1 7 2 8 1z" fill="#3d8f6e" />
          <path d="M32 20c-14 0-22 12-18 24 4 10 14 14 18 14s14-4 18-14c4-12-4-24-18-24z" fill="#e24b4b" stroke="#b42318" strokeWidth="2" />
          <path d="M26 30c2 6 2 12 0 16" fill="none" stroke="#f7b2b2" strokeWidth="2" />
        </svg>
      );
    default:
      return (
        <svg {...box}>
          <rect x="16" y="16" width="32" height="32" rx="8" fill="#e7e5e4" />
        </svg>
      );
  }
}
