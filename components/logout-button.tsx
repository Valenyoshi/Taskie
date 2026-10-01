"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      className="h-9"
      onClick={() => {
        void fetch("/api/auth/logout", { method: "POST" }).then(() => {
          router.push("/entrar");
          router.refresh();
        });
      }}
    >
      Salir
    </Button>
  );
}
