function Bobby() {
  return (
    <svg className="bobby" viewBox="0 0 92 136" width="112" height="164" aria-hidden>
      <rect x="6" y="56" width="18" height="42" rx="3" fill="#f5cd30" stroke="#c9a227" strokeWidth="2" />
      <rect x="68" y="56" width="18" height="42" rx="3" fill="#f5cd30" stroke="#c9a227" strokeWidth="2" />
      <rect x="24" y="98" width="18" height="32" rx="3" fill="#287f47" stroke="#1d5c34" strokeWidth="2" />
      <rect x="50" y="98" width="18" height="32" rx="3" fill="#287f47" stroke="#1d5c34" strokeWidth="2" />
      <rect x="20" y="52" width="52" height="50" rx="4" fill="#0d69ac" stroke="#0a4f82" strokeWidth="2" />
      <rect x="14" y="4" width="64" height="52" rx="8" fill="#f5cd30" stroke="#c9a227" strokeWidth="2" />
      <path d="M22 12c6-4 14-4 18 0" fill="none" stroke="#fff6c2" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="34" cy="24" rx="4.2" ry="6.2" fill="#1a1a1a" />
      <ellipse cx="58" cy="24" rx="4.2" ry="6.2" fill="#1a1a1a" />
      <path d="M34 36c6 10 18 10 24 0" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
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
