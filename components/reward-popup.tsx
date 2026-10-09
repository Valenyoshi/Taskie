"use client";

import { useEffect, useState } from "react";

type RewardPopupProps = {
  open: boolean;
  title: string;
  description: string;
  streak?: number;
  xp: number;
  points: number;
  storageKey?: string;
  onClose?: () => void;
};

export function RewardPopup({
  open,
  title,
  description,
  streak,
  xp,
  points,
  storageKey,
  onClose,
}: RewardPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }

    if (storageKey) {
      try {
        if (window.sessionStorage.getItem(storageKey)) return;
        window.sessionStorage.setItem(storageKey, "1");
      } catch {
        // Si el navegador bloquea sessionStorage, igual mostramos la recompensa.
      }
    }
    setVisible(true);
  }, [open, storageKey]);

  if (!visible) return null;

  function close() {
    setVisible(false);
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-foreground/35 p-5 backdrop-blur-sm" role="presentation">
      <div
        className="reward-popup w-full max-w-sm rounded-[2rem] bg-card p-6 text-center shadow-2xl ring-1 ring-foreground/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-popup-title"
      >
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-secondary text-3xl" aria-hidden>
          ✨
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Recompensa</p>
        <h2 id="reward-popup-title" className="mt-1 font-display text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {streak !== undefined ? (
          <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 font-display text-xl">
            🔥 Racha de {streak} {streak === 1 ? "día" : "días"}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[color-mix(in_oklab,var(--gold)_18%,transparent)] px-3 py-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">Experiencia</p>
            <p className="font-display text-2xl text-gold">+{xp} XP</p>
          </div>
          <div className="rounded-2xl bg-[color-mix(in_oklab,var(--pine)_15%,transparent)] px-3 py-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">Sombreros</p>
            <p className="font-display text-2xl text-pine">+{points}</p>
          </div>
        </div>
        <button type="button" className="lesson-next mt-5 w-full" onClick={close} autoFocus>
          Seguir
        </button>
      </div>
    </div>
  );
}
