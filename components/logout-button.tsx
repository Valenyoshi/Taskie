"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { HandExitIcon } from "@/components/hand-drawn-icons";

const GOODBYES = [
  "¡Adiós! Nos vemos mañana.",
  "Tranquilo, yo cuido las tareas.",
  "¡Hasta luego! Volvé pronto.",
  "Buen descanso. Mañana seguimos.",
  "Adiós, que te vaya bien.",
];

export function LogoutButton() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [goodbye, setGoodbye] = useState(GOODBYES[0]);

  function exit() {
    if (leaving) return;
    setGoodbye(GOODBYES[Math.floor(Math.random() * GOODBYES.length)]);
    setLeaving(true);
    const request = fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    const pause = new Promise((resolve) => window.setTimeout(resolve, 1600));
    void Promise.all([request, pause]).then(() => {
      router.push("/entrar");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        className={`logout-button fixed top-3 left-3 z-30 flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow ring-1 ring-foreground/10 transition hover:bg-card active:scale-95 ${leaving ? "is-leaving" : ""}`}
        onClick={exit}
      >
        <HandExitIcon className="logout-icon size-3.5" />
        Salir
      </button>
      {leaving
        ? createPortal(
            <div className="logout-veil" role="status" aria-label="Saliendo">
              <div className="logout-mark">
                <p className="logout-bye">{goodbye}</p>
                <img src="/kitty-head.png" alt="" />
                <p className="gradient-text font-display text-4xl">Taskie</p>
                <span className="logout-status">
                  Saliendo
                  <span className="taskie-loader-dots" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
