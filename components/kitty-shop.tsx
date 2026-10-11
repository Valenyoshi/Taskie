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
      <div className="kitty-shelves" aria-label="Estanterías de la tienda">
        <div className="kitty-shelf-level">
          <div className="kitty-shelf-chip">
            <span className="retro-check-preview" aria-hidden><span /></span>
            <strong>Check Retro Pixel</strong>
          </div>
        </div>
        <div className="kitty-shelf-level" aria-hidden />
      </div>
      <article className="kitty-featured-product">
        <div className="kitty-product-preview retro-check-preview" aria-hidden>
          <span />
        </div>
        <div className="kitty-featured-copy">
          <p className="kitty-eyebrow">Nuevo en la tienda</p>
          <h2 className="font-display text-2xl">Check Retro Pixel</h2>
          <div className="kitty-featured-actions">
            <small>100 sombreros · 3–4 tareas</small>
            <details className="kitty-product-details">
              <summary aria-label="Ver descripción">•••</summary>
              <p>Un check de videojuego que aparece cuando terminás una tarea.</p>
            </details>
          </div>
          {ownedRetroCheck ? (
            <div className="kitty-purchase">
              <EquipButton kind="theme" id="check-retro" equipped={equippedRetroCheck} />
            </div>
          ) : (
            <PurchaseButton id="check-retro" cost={100} points={points} />
          )}
        </div>
      </article>
    </section>
  );
}
