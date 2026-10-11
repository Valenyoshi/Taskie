"use client";

import { useRouter } from "next/navigation";
import { HandExitIcon } from "@/components/hand-drawn-icons";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="fixed top-3 left-3 z-30 flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow ring-1 ring-foreground/10 transition hover:bg-card active:scale-95"
      onClick={() => {
        void fetch("/api/auth/logout", { method: "POST" }).then(() => {
          router.push("/entrar");
          router.refresh();
        });
      }}
    >
      <HandExitIcon className="size-3.5" />
      Salir
    </button>
  );
}
