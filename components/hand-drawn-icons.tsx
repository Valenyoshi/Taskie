import React from "react";

export function NavHomeIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* Techo dibujado a mano con ligera imperfección */}
      <path d="M2.8 10.5C3.5 9.8 11.2 3.4 12 2.7c.8.7 8.5 7.1 9.2 7.8" strokeWidth="2.1" />
      {/* Chimenea pequeña escolar */}
      <path d="M18 7.2v-2.7h-2.2v1" strokeWidth="1.9" />
      {/* Paredes con trazo orgánico */}
      <path d="M4.5 9.8v10.4c0 .8.6 1.4 1.4 1.4h12.2c.8 0 1.4-.6 1.4-1.4V9.8" strokeWidth="2.1" />
      {/* Puerta redonda arriba estilo cuaderno */}
      <path d="M9.5 21.5v-5.2c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5v5.2" strokeWidth="2" />
    </svg>
  );
}

export function NavMateriasIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* Cuaderno escolar con espiral visible y trazo cálido */}
      <rect x="5.5" y="3.2" width="14" height="17.8" rx="2" strokeWidth="2" />
      <path d="M9 3.2v17.8" strokeWidth="1.7" strokeDasharray="1 2.5" />
      {/* Marcas de espiral / anillas */}
      <path d="M4 6.5h2.8M4 11h2.8M4 15.5h2.8M4 19.5h2.8" strokeWidth="2.2" />
      {/* Marcador de página tipo cinta */}
      <path d="M14 3.2v6.5l2-1.5 2 1.5V3.2" strokeWidth="1.6" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function NavTiendaIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* Toldo curvado de puestito escolar */}
      <path d="M3.2 9.5c.6-3.8 2.2-5.5 8.8-5.5s8.2 1.7 8.8 5.5" strokeWidth="2" />
      <path d="M3 9.5c1 1.6 2.8 1.6 3.8 0 1 1.6 2.8 1.6 3.8 0 1 1.6 2.8 1.6 3.8 0 1 1.6 2.8 1.6 3.8 0 .8 1.2 2 1.2 2.8 0" strokeWidth="1.9" />
      {/* Mostrador de madera */}
      <path d="M4.5 11v8.8c0 .9.7 1.7 1.6 1.7h11.8c.9 0 1.6-.8 1.6-1.7V11" strokeWidth="2" />
      {/* Ventanita de tienda con detalle */}
      <path d="M9 15h6" strokeWidth="2" />
    </svg>
  );
}

export function NavIaIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* Chispa / bombilla dibujada a mano */}
      <path d="M12 2.8v3.2M12 18v3.2M2.8 12h3.2M18 12h3.2" strokeWidth="2" />
      {/* Estrella central con curvaturas suaves */}
      <path d="M12 6c1.2 3.2 2.8 4.8 6 6-3.2 1.2-4.8 2.8-6 6-1.2-3.2-2.8-4.8-6-6 3.2-1.2 4.8-2.8 6-6Z" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
      {/* Pequeño destello de lápiz */}
      <circle cx="18.5" cy="5.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function NavConfigIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* Engranaje artesanal de juguete escolar con centro cálido */}
      <circle cx="12" cy="12" r="3.2" strokeWidth="2.1" fill="currentColor" fillOpacity="0.2" />
      <path
        d="M12 2.8v2.2M12 19v2.2M2.8 12h2.2M19 12h2.2M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M5.5 18.5l1.6-1.6M16.9 7.1l1.6-1.6"
        strokeWidth="2.3"
      />
      <circle cx="12" cy="12" r="7.2" strokeWidth="2" />
    </svg>
  );
}

export function HandSyncIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* Flechas circulares con trazo de boceto */}
      <path d="M20.5 10A8.5 8.5 0 0 0 6.2 5.8L3.5 8.5" strokeWidth="2.1" />
      <path d="M3.5 3.8v4.7h4.7" strokeWidth="2.1" />
      <path d="M3.5 14a8.5 8.5 0 0 0 14.3 4.2l2.7-2.7" strokeWidth="2.1" />
      <path d="M20.5 20.2v-4.7h-4.7" strokeWidth="2.1" />
    </svg>
  );
}

export function HandChevronDown({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6.5 9.2l5.5 5.6 5.5-5.6" strokeWidth="2.4" />
    </svg>
  );
}

export function HandExitIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.5 4.5H5.8c-.7 0-1.3.6-1.3 1.3v12.4c0 .7.6 1.3 1.3 1.3h3.7" strokeWidth="2" />
      <path d="M14.5 16.5l4.5-4.5-4.5-4.5" strokeWidth="2.2" />
      <path d="M19 12H9" strokeWidth="2.2" />
    </svg>
  );
}
