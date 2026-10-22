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
    <div className="fixed inset-0 z-[100] grid place-items-center bg-foreground/35 p-5 backdrop-blur-sm" role="presentation">
      <div
        className="reward-popup w-full max-w-sm rounded-[2rem] bg-card p-6 text-center shadow-2xl ring-1 ring-foreground/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-popup-title"
      >
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-secondary text-coral" aria-hidden>
          <svg className="size-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M16 3l3.5 8.5L28 15l-6.5 6 1.8 9L16 25.5 8.7 30l1.8-9L4 15l8.5-3.5L16 3z" fill="#f6c445" fillOpacity="0.3" />
            <circle cx="25" cy="7" r="1.5" fill="currentColor" />
          </svg>
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
        <button type="button" className="lesson-next mt-5 w-full" onClick={close} autoFocus>
          Seguir
        </button>
      </div>
    </div>
  );
}
