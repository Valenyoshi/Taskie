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
    <section className="kitty-shop" aria-label="Temas">
      <div className="kitty-shop-hello">
        <Image src="/kitty.png" alt="Kitty" width={373} height={668} priority />
        <p>¡Hola, {name}!</p>
      </div>
      <article className="kitty-item">
        <div className="kitty-shelf-chip" aria-hidden>
          <PixelCheck />
        </div>
        <div className="kitty-item-copy">
          <strong>Check Retro Pixel</strong>
          <span className="kitty-shelf-cost">
            100
            <HatIcon size={16} />
          </span>
        </div>
        <div className="kitty-item-actions">
          {ownedRetroCheck ? (
            <EquipButton kind="theme" id="check-retro" equipped={equippedRetroCheck} />
          ) : (
            <PurchaseButton id="check-retro" cost={100} points={points} />
          )}
          <details className="kitty-product-details">
            <summary aria-label="Más información">···</summary>
            <p>Un check de videojuego que aparece cuando terminás una tarea.</p>
          </details>
        </div>
      </article>
    </section>
  );
}
