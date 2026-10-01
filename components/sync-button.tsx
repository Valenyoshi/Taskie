"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SyncButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sync() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/sync", { method: "POST" });
    const data = (await res.json()) as { error?: string; count?: number };
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "No pude sincronizar.");
      return;
    }
    setMessage(data.count ? `Encontré ${data.count} tareas.` : "Entré, y no había tareas nuevas.");
    router.refresh();
  }

  return (
    <div>
      <Button className="h-10" variant="outline" disabled={busy} onClick={() => void sync()}>
        {busy ? "Buscando…" : "Buscar en Educamos"}
      </Button>
      {message ? <p className="mt-2 text-sm">{message}</p> : null}
    </div>
  );
}
