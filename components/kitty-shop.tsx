import Image from "next/image";
import { EquipButton } from "@/components/equip-button";
import { PurchaseButton } from "@/components/purchase-button";

export function KittyShop({
  name,
  points,
  ownedRetroCheck,
  equippedRetroCheck,
}: {
  name: string;
  points: number;
  ownedRetroCheck: boolean;
  equippedRetroCheck: boolean;
}) {
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
      <article className="kitty-featured-product">
        <div className="kitty-product-preview retro-check-preview" aria-hidden>
          <span />
        </div>
        <div className="kitty-featured-copy">
          <p className="kitty-eyebrow">Nuevo en la tienda</p>
          <h2 className="font-display text-2xl">Check Retro Pixel</h2>
          <p>Un check de videojuego que aparece cuando terminás una tarea.</p>
          <small>Cuesta 100 sombreros · aproximadamente 3–4 tareas.</small>
          {ownedRetroCheck ? (
            <EquipButton kind="theme" id="check-retro" equipped={equippedRetroCheck} />
          ) : (
            <PurchaseButton id="check-retro" cost={100} points={points} />
          )}
        </div>
      </article>
    </section>
  );
}
