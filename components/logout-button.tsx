"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="fixed top-3 left-3 z-30 flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow ring-1 ring-foreground/10"
      onClick={() => {
        void fetch("/api/auth/logout", { method: "POST" }).then(() => {
          router.push("/entrar");
          router.refresh();
        });
      }}
    >
      <LogOut className="size-4" />
      Salir
    </button>
  );
}
