import Image from "next/image";
import { EquipButton } from "@/components/equip-button";
import { PixelCheck } from "@/components/pixel-check";
import { PurchaseButton } from "@/components/purchase-button";
import { HatIcon } from "@/components/school-icon";

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
          <svg className="size-4 text-gold" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2l2.6 6.8L21.5 11l-5.6 4.6 1.8 7.2L12 18.8 6.3 22.8l1.8-7.2L2.5 11l6.9-2.2L12 2z" />
          </svg>
          <span>Tienda de Kitty</span>
          <svg className="size-4 text-gold" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2l2.6 6.8L21.5 11l-5.6 4.6 1.8 7.2L12 18.8 6.3 22.8l1.8-7.2L2.5 11l6.9-2.2L12 2z" />
          </svg>
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
        <div className="kitty-shelf-product">
          <div className="kitty-shelf-level">
            <div className="kitty-shelf-chip" aria-hidden>
              <PixelCheck />
            </div>
          </div>
          <div className="kitty-shelf-meta">
            <strong className="kitty-shelf-title">Check Retro Pixel</strong>
            <span className="kitty-shelf-cost">
              100
              <HatIcon size={16} />
            </span>
            <div className="kitty-shelf-actions">
              {ownedRetroCheck ? (
                <EquipButton kind="theme" id="check-retro" equipped={equippedRetroCheck} />
              ) : (
                <PurchaseButton id="check-retro" cost={100} points={points} />
              )}
              <details className="kitty-product-details">
                <summary aria-label="Más información">···</summary>
                <div className="kitty-product-info">
                  Un check de videojuego que aparece cuando terminás una tarea.
                </div>
              </details>
            </div>
          </div>
        </div>
        <div className="kitty-shelf-level" aria-hidden />
      </div>
    </section>
  );
}
