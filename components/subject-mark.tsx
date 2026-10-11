import { subjectColor } from "@/lib/subject-color";

function kind(subject: string): string {
  const name = subject.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (/lengua|literatura/.test(name)) return "lengua";
  if (/matem/.test(name)) return "mate";
  if (/biolog/.test(name)) return "bio";
  if (/natural|fisica|quimica/.test(name)) return "ciencia";
  if (/histor/.test(name)) return "historia";
  if (/geograf/.test(name)) return "geo";
  if (/ingl/.test(name)) return "ingles";
  if (/ciudadan/.test(name)) return "ciudad";
  if (/program|taller|comput/.test(name)) return "codigo";
  return "clase";
}

export function SubjectMark({ subject, size = 36 }: { subject: string; size?: number }) {
  const color = subjectColor(subject);
  const box = { width: size, height: size, viewBox: "0 0 64 64", "aria-hidden": true as const };

  switch (kind(subject)) {
    case "lengua":
      return (
        <svg {...box}>
          {/* Libro escolar abierto con páginas curvadas a mano */}
          <path d="M10 20c7-3 14-2.5 22 1.5v28c-8-4-15-4.5-22-1.5V20z" fill="#fffaf2" stroke={color} strokeWidth="2.8" strokeLinejoin="round" />
          <path d="M54 20c-7-3-14-2.5-22 1.5v28c8-4 15-4.5 22-1.5V20z" fill={color} stroke={color} strokeWidth="2.8" strokeLinejoin="round" />
          {/* Cinta señaladora colgando */}
          <path d="M32 21.5v16l2-2 2 2v-16" fill="#e25b45" />
          {/* Líneas de texto estilo apunte */}
          <path d="M15 28c4-.8 9-.6 13 1M15 34c4-.8 9-.6 13 1M15 40c3-.6 6-.5 9 .8" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M36 29c4-.8 9-.6 13 1M36 35c4-.8 9-.6 13 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "mate":
      return (
        <svg {...box}>
          {/* Hoja cuadriculada con compás y símbolos a mano */}
          <rect x="12" y="10" width="40" height="44" rx="4" fill="#fffaf2" stroke={color} strokeWidth="2.8" />
          {/* Cuadrícula suave de cuaderno */}
          <path d="M22 10v44M32 10v44M42 10v44M12 21h40M12 32h40M12 43h40" stroke={color} strokeWidth="1" strokeOpacity="0.25" />
          {/* Triángulo dibujado a mano alzada con hipotenusa */}
          <path d="M18 43l18-20v20H18z" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2.6" strokeLinejoin="round" />
          {/* Raíz cuadrada o signo más manuscrito */}
          <path d="M38 22h8M42 18v8" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M38 37h8M38 41h8" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "bio":
      return (
        <svg {...box}>
          {/* Hoja viva con nervaduras dibujadas a mano alzada */}
          <path
            d="M32 54C20 46 14 32 18 16c8 2 22 10 24 24 1.5 10-4 13-10 14Z"
            fill={color}
            stroke={color}
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          {/* Tallo central y nervaduras */}
          <path d="M22 49c6-10 11-20 15-28" fill="none" stroke="#fffaf2" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M27 38c4-1 8 0 11 3M24 29c4-1.5 7-.5 9 2" fill="none" stroke="#fffaf2" strokeWidth="2" strokeLinecap="round" />
          {/* Brote tierno */}
          <circle cx="37" cy="18" r="2.5" fill="#f4cd42" />
        </svg>
      );
    case "ciencia":
      return (
        <svg {...box}>
          {/* Matraz de química con burbujas y medidas graduadas */}
          <path d="M27 10h10M32 10v14l13 22c2 3.5 0 8-5 8H24c-5 0-7-4.5-5-8l13-22V10" fill="#fffaf2" stroke={color} strokeWidth="2.8" strokeLinejoin="round" />
          {/* Líquido burbujeante adentro */}
          <path d="M21 46c2.5-1.5 6-1 8 1s6 .5 8-.5l5 7.5c0 0-1 0-3 0H24c-3 0-4-3-3-8z" fill={color} fillOpacity="0.85" />
          {/* Burbujitas flotantes */}
          <circle cx="28" cy="38" r="2" fill={color} />
          <circle cx="35" cy="42" r="1.5" fill="#fffaf2" />
          <circle cx="31" cy="30" r="1.3" fill={color} />
          {/* Rayitas de graduación */}
          <path d="M30 16h3M29 20h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "historia":
      return (
        <svg {...box}>
          {/* Pergamino antiguo desenrollado */}
          <path
            d="M16 16c0-3.5 3.5-5 7-5h22c4 0 7 2 7 5.5s-3 5.5-7 5.5H23c-4 0-7 1.5-7 5v20c0 4 3 6 7 6h20c4.5 0 8-2 8-6V22"
            fill="#fffaf2"
            stroke={color}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Sello de cera en la esquina */}
          <circle cx="24" cy="44" r="5" fill="#e25b45" stroke="#a8281b" strokeWidth="1.5" />
          {/* Líneas de escritura antigua */}
          <path d="M24 24h18M24 30h22M24 36h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "geo":
      return (
        <svg {...box}>
          {/* Globo terráqueo en soporte de aula escolar */}
          <circle cx="32" cy="27" r="16" fill="#fffaf2" stroke={color} strokeWidth="2.8" />
          {/* Continentes orgánicos trazados a mano */}
          <path d="M23 20c3 0 5 3 4 6-2 1-4 0-5-2s0-4 1-4z" fill={color} />
          <path d="M35 18c4 1 7 4 6 7-2 4-6 5-7 3s0-8 1-10z" fill={color} />
          <path d="M30 35c2-2 5-1 6 2-1 3-5 5-7 3s0-4 1-5z" fill={color} />
          {/* Arco del soporte del globo */}
          <path d="M32 7c11 0 20 9 20 20s-9 20-20 20" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
          {/* Base de madera */}
          <path d="M32 47v7M23 54h18" stroke={color} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "ingles":
      return (
        <svg {...box}>
          {/* Globo de diálogo ilustrado con lápiz */}
          <path
            d="M12 28c0-9 8-16 20-16s20 7 20 16-8 16-20 16c-3.5 0-7-.6-10-1.8L12 47l2.5-8.5C13 35 12 31.6 12 28Z"
            fill="#fffaf2"
            stroke={color}
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          {/* Letras amigables "Hi!" dentro */}
          <path d="M22 23v10M30 23v10M22 28h8" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
          <path d="M38 23v7" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="38" cy="34" r="1.5" fill={color} />
        </svg>
      );
    case "ciudad":
      return (
        <svg {...box}>
          {/* Manos que se unen o corazón cívico / columna */}
          <path d="M14 48h36M18 48V28M46 48V28M32 48V28" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
          {/* Frontón clásico escolar */}
          <path d="M12 28L32 14l20 14H12z" fill="#fffaf2" stroke={color} strokeWidth="2.8" strokeLinejoin="round" />
          {/* Detalle cívico: estrella / sol en el frontón */}
          <circle cx="32" cy="22" r="3" fill={color} />
          <path d="M10 52h44" stroke={color} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "codigo":
      return (
        <svg {...box}>
          {/* Pantallita retro con carita / código simpático */}
          <rect x="10" y="14" width="44" height="34" rx="7" fill="#fffaf2" stroke={color} strokeWidth="2.8" />
          {/* Soporte */}
          <path d="M26 48l-3 6h18l-3-6" stroke={color} strokeWidth="2.6" strokeLinejoin="round" />
          {/* Chevrons y barra con trazo más grueso y amigable */}
          <path d="M24 25l-6 6 6 6" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M40 25l6 6-6 6" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M34 23l-4 16" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...box}>
          {/* Carpeta escolar con solapa */}
          <path d="M12 18c0-2 1.5-3.5 3.5-3.5h11l4 4h18c2 0 3.5 1.5 3.5 3.5v24c0 2-1.5 3.5-3.5 3.5h-33c-2 0-3.5-1.5-3.5-3.5V18z" fill="#fffaf2" stroke={color} strokeWidth="2.8" strokeLinejoin="round" />
          <path d="M20 28h24M20 34h16M20 40h10" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
  }
}
