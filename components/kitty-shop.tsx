import Image from "next/image";

const PRODUCTS = [
  { emoji: "✏️", name: "Lápiz brillante", detail: "Para ideas nuevas" },
  { emoji: "📓", name: "Cuaderno", detail: "Hojas para aprender" },
  { emoji: "🎒", name: "Mochila", detail: "Lista para la próxima clase" },
  { emoji: "🏆", name: "Copa del aula", detail: "Un premio especial" },
];

function CashRegister() {
  return (
    <div className="kitty-register" aria-label="Caja registradora">
      <div className="kitty-register-screen">
        <span>★</span>
        <span>★</span>
        <span>★</span>
      </div>
      <div className="kitty-register-body">
        <div className="kitty-register-buttons">
          {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
        </div>
        <div className="kitty-register-drawer" />
      </div>
    </div>
  );
}

export function KittyShop() {
  return (
    <section className="kitty-shop" aria-label="Tienda de Kitty">
      <div className="kitty-shop-scene">
        <div className="kitty-shop-sign">
          <span className="kitty-shop-star">✦</span>
          <span>Tienda de Kitty</span>
          <span className="kitty-shop-star">✦</span>
        </div>

        <div className="kitty-shop-shelf" aria-hidden>
          <span>🎁</span>
          <span>📚</span>
          <span>🌟</span>
          <span>🧸</span>
        </div>

        <div className="kitty-counter">
          <div className="kitty-shopkeeper">
            <Image
              src="/kitty.png"
              alt="Kitty, la dueña de la tienda"
              width={373}
              height={668}
              priority
            />
            <span className="kitty-name-tag">Kitty</span>
          </div>
          <div className="kitty-counter-top">
            <CashRegister />
            <div className="kitty-counter-note">
              <span>¡Hola!</span>
              <small>Elegí tu premio</small>
            </div>
          </div>
          <div className="kitty-counter-front">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      <div className="kitty-products-header">
        <div>
          <p className="kitty-eyebrow">El mostrador de Kitty</p>
          <h2 className="font-display text-2xl">Premios para elegir</h2>
        </div>
        <span className="kitty-paw" aria-hidden>🐾</span>
      </div>
      <div className="kitty-products">
        {PRODUCTS.map((product) => (
          <article className="kitty-product" key={product.name}>
            <span className="kitty-product-icon" aria-hidden>{product.emoji}</span>
            <div>
              <h3>{product.name}</h3>
              <p>{product.detail}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="kitty-shop-hint">Kitty está preparando más sorpresas para la tienda.</p>
    </section>
  );
}
