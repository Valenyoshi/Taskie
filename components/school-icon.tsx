export function HatIcon({ size = 42 }: { size?: number }) {
  return (
    <svg className="points-coin" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      {/* Sombra suave de apoyo sobre la superficie */}
      <ellipse cx="32" cy="51" rx="19" ry="5.5" fill="#1c1613" fillOpacity="0.18" />

      {/* Casquete o copa de la cabeza con volumen y borde acolchado */}
      <path
        d="M17 35.5c.8 8.5 6.5 14 15 14s14.2-5.5 15-14c-4.5 2.5-9.8 4-15 4s-10.5-1.5-15-4Z"
        fill="#1a1410"
        stroke="#2c221a"
        strokeWidth="1.5"
      />
      {/* Doble pliegue inferior realista */}
      <ellipse cx="32" cy="35" rx="15" ry="4.5" fill="#241c16" />

      {/* Rombo o birrete superior con ángulo en perspectiva natural */}
      <path
        d="M32 12.5L58 24.8 32 37.2 6 24.8 32 12.5Z"
        fill="#1a1410"
        stroke="#2c221a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Faceta iluminada que da textura de tela */}
      <path d="M32 13.5L56 24.8 32 36v-22.5Z" fill="#2d231c" fillOpacity="0.45" />

      {/* Brillo textil trazado sutilmente */}
      <path d="M12 24.5l19-8.5 18 8.5" fill="none" stroke="#524337" strokeWidth="1.6" strokeLinecap="round" />

      {/* Botón central dorado bordado */}
      <circle cx="32" cy="24.8" r="3.2" fill="#e8a317" stroke="#b5780a" strokeWidth="1.2" />
      <circle cx="31.2" cy="24" r="1" fill="#fff6d2" />

      {/* Cordón que cae con curva orgánica y peso real */}
      <path
        d="M32 25.5c4 1.8 11.2 5.5 15.2 13.5 1.5 3 2.6 6 2.4 8.5"
        fill="none"
        stroke="#e8a317"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Nudo de la borla */}
      <circle cx="49.5" cy="47.5" r="2.2" fill="#c98412" />

      {/* Flecos de la borla dorada con caída suelta */}
      <path
        d="M48 49.5l-1.8 9.5M49.6 49.8l.2 10M51 49.5l1.6 9.5"
        stroke="#e8a317"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      {/* Hilos dorados finos para detalle artesanal */}
      <path d="M47.2 59h5.5" stroke="#f6c445" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SchoolIcon({ id, size = 48 }: { id: string; size?: number }) {
  const box = { width: size, height: size, viewBox: "0 0 64 64", "aria-hidden": true as const };

  switch (id) {
    case "lapiz":
      return (
        <svg {...box}>
          {/* Lápiz escolar amarillo con grafito desgastado por uso real */}
          {/* Goma de borrar superior con textura redondeada */}
          <path d="M26 12c0-3 3-5 6-5s6 2 6 5v3H26v-3z" fill="#f798a8" stroke="#bd5164" strokeWidth="1.8" />
          {/* Virola de metal con estrías */}
          <rect x="25" y="15" width="14" height="6" rx="1" fill="#d7dde3" stroke="#8795a3" strokeWidth="1.8" />
          <path d="M27 18h10" stroke="#aab5c0" strokeWidth="1.2" />
          {/* Cuerpo hexagonal de madera pintada */}
          <path d="M25 21h14v22H25z" fill="#f5cd30" stroke="#b08608" strokeWidth="1.8" />
          <path d="M29.5 21v22M34.5 21v22" stroke="#e0b216" strokeWidth="1.5" />
          {/* Madera afilada vista */}
          <path d="M25 43l7 14 7-14z" fill="#f4dfb8" stroke="#b08608" strokeWidth="1.8" strokeLinejoin="round" />
          {/* Punta de grafito */}
          <path d="M29.5 52l2.5 5 2.5-5z" fill="#2d2926" />
        </svg>
      );
    case "regla":
      return (
        <svg {...box}>
          {/* Regla de madera escolar con vetas y marcas de milímetros */}
          <rect x="8" y="21" width="48" height="18" rx="2.5" fill="#f0ce96" stroke="#9a6e30" strokeWidth="2" />
          <path d="M8 35c12-1 24 0 48-1" stroke="#e2b977" strokeWidth="1.5" />
          {/* Marcas de centímetro y medio centímetro */}
          {[14, 22, 30, 38, 46].map((x) => (
            <path key={x} d={`M${x} 21v8`} stroke="#6e4c1f" strokeWidth="2" strokeLinecap="round" />
          ))}
          {[18, 26, 34, 42, 50].map((x) => (
            <path key={x} d={`M${x} 21v4.5`} stroke="#8f6329" strokeWidth="1.5" strokeLinecap="round" />
          ))}
          {/* Número pequeño grabado */}
          <circle cx="14" cy="33" r="1.2" fill="#6e4c1f" />
          <circle cx="30" cy="33" r="1.2" fill="#6e4c1f" />
          <circle cx="46" cy="33" r="1.2" fill="#6e4c1f" />
        </svg>
      );
    case "clip":
      return (
        <svg {...box}>
          {/* Clip metálico con brillo real y torsión orgánica */}
          <path
            d="M26 12c-7 0-12 5-12 12v18c0 7 5 12 13 12s13-5 13-12V20c0-5-3.5-9-8.5-9S23 15 23 20v21c0 3 2 5.5 5 5.5s5-2.5 5-5.5V21"
            fill="none"
            stroke="#6e7b8c"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path
            d="M26.5 13c-6 0-10.5 4-10.5 11v18c0 6 4 10.5 11.5 10.5s11.5-4.5 11.5-10.5V20"
            fill="none"
            stroke="#b6c2cf"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "crayon":
      return (
        <svg {...box}>
          {/* Crayón de cera con etiqueta de papel rasgado */}
          <path d="M22 10c0-3 3-5 10-5s10 2 10 5l-2 9H24z" fill="#e8503a" stroke="#9e2d1d" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="20" y="19" width="24" height="34" rx="2" fill="#f47442" stroke="#9e2d1d" strokeWidth="2" />
          {/* Faja de papel con líneas onduladas */}
          <rect x="20" y="27" width="24" height="18" fill="#fff5ea" stroke="#9e2d1d" strokeWidth="1.8" />
          <circle cx="32" cy="36" r="3.5" fill="#f47442" />
          {/* Base biselada */}
          <path d="M22 53h20l-1 5H23z" fill="#e8503a" stroke="#9e2d1d" strokeWidth="1.8" />
        </svg>
      );
    case "cuaderno":
      return (
        <svg {...box}>
          {/* Cuaderno de espiral con textura de tapa dura y renglones */}
          <rect x="18" y="9" width="34" height="46" rx="3.5" fill="#fffaf0" stroke="#968065" strokeWidth="2.2" />
          <path d="M23 9v46" stroke="#d5c7b3" strokeWidth="1.8" />
          {/* Anillas de metal */}
          {[14, 21, 28, 35, 42, 49].map((y) => (
            <g key={y}>
              <ellipse cx="18" cy={y} rx="3.5" ry="2" fill="#6a7785" />
              <ellipse cx="18" cy={y} rx="2" ry="1" fill="#fff" />
            </g>
          ))}
          {/* Renglones manuscritos */}
          {[20, 28, 36, 44].map((y) => (
            <path key={y} d={`M27 ${y}h19`} stroke="#b5ccde" strokeWidth="1.8" strokeLinecap="round" />
          ))}
          {/* Esquina doblada simpática */}
          <path d="M46 9l6 6h-6V9z" fill="#e8dac4" stroke="#968065" strokeWidth="1.5" />
        </svg>
      );
    case "goma":
      return (
        <svg {...box}>
          {/* Goma de borrar bicolor en perspectiva con bordes suavizados por el uso */}
          <path d="M12 28l18-12 22 10-18 12L12 28z" fill="#f3a4b2" stroke="#ab495b" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 28v12l18 12V40L12 28z" fill="#de6b80" stroke="#ab495b" strokeWidth="2" strokeLinejoin="round" />
          <path d="M30 40l22-10v12l-22 10V40z" fill="#4d92c7" stroke="#235a82" strokeWidth="2" strokeLinejoin="round" />
          {/* Faja de cartón protector */}
          <path d="M26 23l14 6-5 13-14-6z" fill="#fffaf0" stroke="#ab495b" strokeWidth="1.5" />
        </svg>
      );
    case "mochila":
      return (
        <svg {...box}>
          {/* Manija superior acolchada */}
          <path d="M25 15c0-5 14-5 14 0" fill="none" stroke="#1f4f3c" strokeWidth="3.2" strokeLinecap="round" />
          {/* Cuerpo principal redondeado con arrugas de tela */}
          <rect x="15" y="17" width="34" height="38" rx="9" fill="#2d6f54" stroke="#193f30" strokeWidth="2.2" />
          {/* Bolsillo delantero con cierre curvo */}
          <rect x="20" y="31" width="24" height="18" rx="4" fill="#3c8b6b" stroke="#193f30" strokeWidth="2" />
          <path d="M20 37h24" stroke="#f6c445" strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="37" r="1.8" fill="#193f30" />
          {/* Presilla o llavero colgando */}
          <circle cx="43" cy="27" r="2.5" fill="#f6c445" stroke="#193f30" strokeWidth="1.2" />
        </svg>
      );
    case "tubo":
      return (
        <svg {...box}>
          {/* Tubo de ensayo con menisco de líquido y tapón de corcho */}
          <rect x="27" y="6" width="10" height="6" rx="1.5" fill="#d49b6a" stroke="#875124" strokeWidth="1.8" />
          <path d="M26 12h12v32c0 6-5 10-6 10s-6-4-6-10V12z" fill="#f0f7ff" stroke="#486a8a" strokeWidth="2.2" strokeLinejoin="round" />
          {/* Líquido burbujeante con gradiente y menisco curvo */}
          <path d="M26 33c3-1.5 9-1.5 12 0v11c0 6-5 10-6 10s-6-4-6-10V33z" fill="#3b9fd9" />
          <ellipse cx="32" cy="33" rx="6" ry="1.5" fill="#6dc4fa" />
          <circle cx="30" cy="40" r="1.6" fill="#fff" />
          <circle cx="34" cy="45" r="1.2" fill="#fff" />
          {/* Reflejo de vidrio */}
          <path d="M28 16v12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8" />
        </svg>
      );
    case "abaco":
      return (
        <svg {...box}>
          {/* Ábaco de madera con cuentas de colores cálidos */}
          <rect x="11" y="9" width="42" height="46" rx="4" fill="#d99b55" stroke="#6e4414" strokeWidth="2.4" />
          <rect x="15" y="13" width="34" height="38" rx="2" fill="#fffbf4" stroke="#6e4414" strokeWidth="1.6" />
          {/* Varillas de metal */}
          {[22, 32, 42].map((y) => (
            <path key={y} d={`M15 ${y}h34`} stroke="#8f6329" strokeWidth="1.6" />
          ))}
          {/* Cuentas redondeadas que parecen de madera pulida */}
          <circle cx="23" cy="22" r="4.2" fill="#e25b45" stroke="#9c2718" strokeWidth="1.2" />
          <circle cx="31" cy="22" r="4.2" fill="#e25b45" stroke="#9c2718" strokeWidth="1.2" />
          <circle cx="43" cy="22" r="4.2" fill="#e25b45" stroke="#9c2718" strokeWidth="1.2" />

          <circle cx="21" cy="32" r="4.2" fill="#f6c445" stroke="#a87c08" strokeWidth="1.2" />
          <circle cx="37" cy="32" r="4.2" fill="#f6c445" stroke="#a87c08" strokeWidth="1.2" />
          <circle cx="44" cy="32" r="4.2" fill="#f6c445" stroke="#a87c08" strokeWidth="1.2" />

          <circle cx="22" cy="42" r="4.2" fill="#1c7c6e" stroke="#0e4a41" strokeWidth="1.2" />
          <circle cx="29" cy="42" r="4.2" fill="#1c7c6e" stroke="#0e4a41" strokeWidth="1.2" />
          <circle cx="42" cy="42" r="4.2" fill="#1c7c6e" stroke="#0e4a41" strokeWidth="1.2" />
        </svg>
      );
    case "paleta":
      return (
        <svg {...box}>
          {/* Paleta de madera con manchas de pintura en relieve */}
          <path
            d="M18 36c-2-12 8-22 24-20 11 1.5 15 12 11 22-3 7-10 12-18 10-3-.8-6 1-7 4-1 4-6 4-8 1-4-5-2-11-2-17Z"
            fill="#ecd8b9"
            stroke="#8a673c"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Agujero para el pulgar */}
          <ellipse cx="23" cy="43" rx="3.5" ry="4.5" fill="#fbf5eb" stroke="#8a673c" strokeWidth="1.5" />
          {/* Gotas de témpera con volumen */}
          <circle cx="27" cy="23" r="4" fill="#e25b45" />
          <circle cx="36" cy="19" r="4" fill="#f6c445" />
          <circle cx="44" cy="27" r="4" fill="#1c7c6e" />
          <circle cx="38" cy="36" r="4" fill="#3b76d6" />
          {/* Brillos en las pinturas */}
          <circle cx="25.5" cy="21.5" r="1.2" fill="#fff" />
          <circle cx="34.5" cy="17.5" r="1.2" fill="#fff" />
          <circle cx="42.5" cy="25.5" r="1.2" fill="#fff" />
        </svg>
      );
    case "libro":
      return (
        <svg {...box}>
          {/* Libro escolar grueso con lomo redondo */}
          <path d="M13 14c6-2 13-1 19 3v32c-6-3-13-3-19-1V14z" fill="#2d6f54" stroke="#173f2f" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M51 14c-6-2-13-1-19 3v32c6-3 13-3 19-1V14z" fill="#3c8b6b" stroke="#173f2f" strokeWidth="2.2" strokeLinejoin="round" />
          {/* Páginas doradas vistas por arriba */}
          <path d="M32 17v32" stroke="#f6c445" strokeWidth="2.4" />
          {/* Grabado en la tapa */}
          <circle cx="22" cy="26" r="3" fill="#f6c445" stroke="#173f2f" strokeWidth="1" />
          <path d="M18 36h9" stroke="#f6c445" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "copa":
      return (
        <svg {...box}>
          {/* Copa dorada de campeonato escolar con brillo */}
          <path d="M19 13h26l-3 17c-1.5 8-7 13-10 13s-8.5-5-10-13L19 13z" fill="#f6c445" stroke="#9c7308" strokeWidth="2.2" strokeLinejoin="round" />
          {/* Brillo curvo */}
          <path d="M23 18c0 7 4 11 8 11" fill="none" stroke="#fff8dc" strokeWidth="2" strokeLinecap="round" />
          {/* Asas laterales */}
          <path d="M19 17c-5 0-7 4-6 9s4 6 7 6M45 17c5 0 7 4 6 9s-4 6-7 6" fill="none" stroke="#9c7308" strokeWidth="2.2" strokeLinecap="round" />
          {/* Pie y base */}
          <path d="M32 43v8M23 51h18v4H23z" fill="#b0861a" stroke="#6e4f04" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "globo":
      return (
        <svg {...box}>
          {/* Globo terráqueo vintage */}
          <circle cx="32" cy="25" r="16" fill="#88c3ea" stroke="#2c5c82" strokeWidth="2.2" />
          {/* Continentes con silueta orgánica */}
          <path d="M22 19c3 0 5 3 4 6-2 2-5 1-6-1s0-4 2-5z" fill="#4ea671" />
          <path d="M36 17c4 1 7 4 6 8-2 3-6 4-7 2s0-9 1-10z" fill="#4ea671" />
          <path d="M28 33c3-1 6 0 6 3-2 3-6 4-7 1s-1-3 1-4z" fill="#4ea671" />
          {/* Arco meridiano de latón */}
          <path d="M32 6c11 0 20 8.5 20 19s-9 19-20 19" fill="none" stroke="#b0861a" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M32 44v7M23 51h18" stroke="#6e4f04" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "microscopio":
      return (
        <svg {...box}>
          {/* Microscopio de laboratorio escolar */}
          <rect x="29" y="8" width="8" height="15" rx="3" fill="#4b5563" stroke="#1f2937" strokeWidth="1.8" />
          <path d="M33 23v4" stroke="#9ca3af" strokeWidth="2.4" />
          {/* Platina con portaobjetos */}
          <rect x="20" y="36" width="24" height="4" rx="1.5" fill="#1f2937" />
          <rect x="26" y="34" width="12" height="2" fill="#93c5fd" />
          {/* Brazo curvo de fundición */}
          <path d="M33 15c8 0 13 6 13 15 0 9-4 15-9 17" fill="none" stroke="#4b5563" strokeWidth="3.2" strokeLinecap="round" />
          {/* Base pesada de herradura */}
          <path d="M19 53h26v3H19z" fill="#1f2937" stroke="#111827" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "manzana":
      return (
        <svg {...box}>
          {/* Manzana roja con brillo y hojita tierna */}
          <path d="M32 15c2-6 8-8 10-6" fill="none" stroke="#5c3b1a" strokeWidth="2.2" strokeLinecap="round" />
          {/* Hojita verde inclinada */}
          <path d="M33 16c4-4 10-3 11 1-3 3-9 2-11-1z" fill="#4ea671" stroke="#256e42" strokeWidth="1.4" />
          {/* Fruta roja con volumen cálido */}
          <path
            d="M32 19c-5-2-13 1-15 9-2 9 6 22 15 22s17-13 15-22c-2-8-10-11-15-9Z"
            fill="#e24b4b"
            stroke="#9e1e1e"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Brillo en curva */}
          <path d="M23 27c0 6 3 11 6 13" fill="none" stroke="#fca5a5" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.8" />
        </svg>
      );
    default:
      return (
        <svg {...box}>
          <rect x="14" y="14" width="36" height="36" rx="8" fill="#fffaf0" stroke="#9a7b56" strokeWidth="2.2" />
          <circle cx="32" cy="32" r="5" fill="#f6c445" />
        </svg>
      );
  }
}
