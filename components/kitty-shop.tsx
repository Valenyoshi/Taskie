import Image from "next/image";

export function KittyShop({ name }: { name: string }) {
  return (
    <section className="kitty-shop" aria-label="Tienda de Kitty">
      <div className="kitty-shop-scene">
        <div className="kitty-shop-sign">
          <span className="kitty-shop-star">✦</span>
          <span>Tienda de Kitty</span>
          <span className="kitty-shop-star">✦</span>
        </div>

        <div className="kitty-counter">
          <div className="kitty-shopkeeper">
            <div className="kitty-dialogue" role="status">
              <span>¡Hola, {name}!</span>
              <i aria-hidden />
            </div>
            <Image
              src="/kitty.png"
              alt="Kitty, la dueña de la tienda"
              width={373}
              height={668}
              priority
            />
            <span className="kitty-name-tag">Kitty</span>
          </div>
          <div className="kitty-counter-top" />
          <div className="kitty-counter-front">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </section>
  );
}
