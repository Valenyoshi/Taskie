"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandExitIcon } from "@/components/hand-drawn-icons";

export function LogoutButton() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  function exit() {
    if (leaving) return;
    setLeaving(true);
    const request = fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    const pause = new Promise((resolve) => window.setTimeout(resolve, 560));
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
      {leaving ? <span className="logout-veil" aria-hidden /> : null}
    </>
  );
}
