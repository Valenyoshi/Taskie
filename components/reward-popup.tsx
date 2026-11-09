"use client";

import { useEffect, useState } from "react";

type RewardPopupProps = {
  open: boolean;
  title: string;
  description: string;
  streak?: number;
  storageKey?: string;
  onClose?: () => void;
};

export function RewardPopup({
  open,
  title,
  description,
  streak,
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
    <div className="fixed inset-0 z-[100] grid place-items-center bg-foreground/40 p-5" role="presentation">
      <div
        className="reward-popup w-full max-w-sm rounded-xl border border-[rgba(60,42,28,0.16)] bg-card p-6 text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-popup-title"
      >
        <h2 id="reward-popup-title" className="font-display text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {streak !== undefined ? (
          <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 font-display text-xl">
            Racha de {streak} {streak === 1 ? "día" : "días"}
          </p>
        ) : null}
        <button type="button" className="lesson-next mt-5 w-full" onClick={close} autoFocus>
          Seguir
        </button>
      </div>
    </div>
  );
}
