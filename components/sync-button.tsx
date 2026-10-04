"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sync() {
    setBusy(true);
    setMessage(null);
    let res: Response;
    let data: { error?: string; count?: number };
    try {
      res = await fetch("/api/sync", { method: "POST" });
      data = (await res.json()) as { error?: string; count?: number };
    } catch {
      setBusy(false);
      setMessage("No pude actualizar.");
      return;
    }
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "No pude actualizar.");
      return;
    }
    setMessage(data.count ? String(data.count) : "0");
    router.refresh();
  }

  return (
    <button type="button" disabled={busy} onClick={() => void sync()} className="rounded-full bg-pine px-3 py-1.5 text-xs font-semibold text-white">
      {busy ? "…" : message ?? "Actualizar"}
    </button>
  );
}
