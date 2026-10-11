"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PurchaseButton({
  id,
  cost,
  points,
}: {
  id: string;
  cost: number;
  points: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enough = points >= cost;

  async function purchase() {
    if (busy || !enough) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo comprar.");
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo comprar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kitty-purchase">
      <button type="button" onClick={() => void purchase()} disabled={busy || !enough}>
        {busy ? "Comprando…" : enough ? "Comprar" : `Faltan ${cost - points}`}
      </button>
      {error ? <p>{error}</p> : null}
    </div>
  );
}
