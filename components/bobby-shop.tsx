function Bobby() {
  return (
    <svg className="bobby" viewBox="0 0 92 136" width="112" height="164" aria-hidden>
      {/* Sombra en el piso */}
      <ellipse cx="46" cy="132" rx="34" ry="4" fill="#000" fillOpacity="0.12" />
      {/* Brazos cálidos con mangas */}
      <rect x="6" y="56" width="16" height="42" rx="6" fill="#f5cd30" stroke="#a67c0f" strokeWidth="2" />
      <circle cx="14" cy="98" r="7" fill="#f5cd30" stroke="#a67c0f" strokeWidth="2" />
      <rect x="70" y="56" width="16" height="42" rx="6" fill="#f5cd30" stroke="#a67c0f" strokeWidth="2" />
      <circle cx="78" cy="98" r="7" fill="#f5cd30" stroke="#a67c0f" strokeWidth="2" />
      {/* Piernitas de pantalón de pana verde */}
      <rect x="23" y="96" width="18" height="32" rx="5" fill="#2d6f54" stroke="#173f2f" strokeWidth="2" />
      <ellipse cx="32" cy="128" rx="10" ry="5" fill="#173f2f" />
      <rect x="51" y="96" width="18" height="32" rx="5" fill="#2d6f54" stroke="#173f2f" strokeWidth="2" />
      <ellipse cx="60" cy="128" rx="10" ry="5" fill="#173f2f" />
      {/* Jardinero / overol con tiradores y botones */}
      <rect x="18" y="52" width="56" height="50" rx="8" fill="#1b639e" stroke="#0f3c63" strokeWidth="2.2" />
      <path d="M26 52v18M66 52v18" stroke="#0f3c63" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="26" cy="70" r="2.8" fill="#f6c445" stroke="#0f3c63" strokeWidth="1.2" />
      <circle cx="66" cy="70" r="2.8" fill="#f6c445" stroke="#0f3c63" strokeWidth="1.2" />
      {/* Bolsillo central con lápiz asomando */}
      <rect x="36" y="68" width="20" height="18" rx="3" fill="#144d7a" stroke="#0f3c63" strokeWidth="1.6" />
      <path d="M42 63l4 8" stroke="#e25b45" strokeWidth="2.4" strokeLinecap="round" />
      {/* Cabeza sonriente con orejitas suaves */}
      <rect x="14" y="4" width="64" height="52" rx="12" fill="#f5cd30" stroke="#a67c0f" strokeWidth="2.2" />
      {/* Pelo / flequillo a mano alzada */}
      <path d="M22 10c8-4 16-4 22 2 4-3 10-3 14 1" fill="none" stroke="#fff8dc" strokeWidth="3" strokeLinecap="round" />
      {/* Ojos brillantes expresivos con pupila y destello */}
      <ellipse cx="34" cy="24" rx="4.5" ry="6.5" fill="#1a1410" />
      <circle cx="32.5" cy="22" r="1.8" fill="#fff" />
      <ellipse cx="58" cy="24" rx="4.5" ry="6.5" fill="#1a1410" />
      <circle cx="56.5" cy="22" r="1.8" fill="#fff" />
      {/* Mejillas sonrojadas de dibujo hecho a mano */}
      <circle cx="25" cy="32" r="4.5" fill="#f798a8" fillOpacity="0.6" />
      <circle cx="67" cy="32" r="4.5" fill="#f798a8" fillOpacity="0.6" />
      {/* Sonrisa traviesa con hoyuelo */}
      <path d="M34 35c6 8 18 8 24 0" fill="none" stroke="#1a1410" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M32 34l2 2M60 34l-2 2" stroke="#1a1410" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Litera() {
  return (
    <div className="litera">
      <div className="litera-post" />
      <div className="litera-levels">
        {[0, 1].map((level) => (
          <div className="bunk" key={level}>
            <div className="bunk-slots">
              <span className="bunk-slot" />
              <span className="bunk-slot" />
            </div>
            <div className="plank" />
          </div>
        ))}
      </div>
      <div className="ladder" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function BobbyShop() {
  return (
    <section className="bobby-shop" aria-label="Tienda de Bobby">
      <div className="shop-counter">
        <Bobby />
        <p className="shop-bubble">Hola, soy Bobby. Cuando tenga cosas, las dejo en las literas.</p>
        <div className="shop-floor" />
      </div>
      <div className="literas">
        <Litera />
        <Litera />
      </div>
      <p className="shop-empty">Todavía no hay nada a la venta.</p>
    </section>
  );
}
