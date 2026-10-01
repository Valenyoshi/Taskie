"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { rarityLabel, type Rarity } from "@/lib/game";

export function PullMachine({ points, cost, missing }: { points: number; cost: number; missing: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; rarity: Rarity; duplicate: boolean; lines: string[] } | null>(null);

  async function pull() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/pull", { method: "POST" });
    const data = (await res.json()) as {
      error?: string;
      rewardName?: string;
      rarity?: Rarity;
      duplicate?: boolean;
      lines?: string[];
    };
    setBusy(false);
    if (!res.ok || !data.rewardName || !data.rarity) {
      setError(data.error ?? "La máquina no respondió.");
      return;
    }
    setResult({
      name: data.rewardName,
      rarity: data.rarity,
      duplicate: Boolean(data.duplicate),
      lines: data.lines ?? [],
    });
    router.refresh();
  }

  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-sm text-muted-foreground">Puntos para tirar</p>
      <p className="font-display text-4xl text-points">{points}</p>
      <p className="mt-1 text-sm">Cada tirada cuesta {cost} puntos. Común 60%, raro 32%, súper raro 8%.</p>
      <Button className="mt-4 h-12 w-full text-base" disabled={busy || missing > 0} onClick={() => void pull()}>
        {busy ? "Girando…" : missing > 0 ? `Te faltan ${missing} puntos` : "Tirar"}
      </Button>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {result ? (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-4">
          <p className="text-xs uppercase tracking-wide">{rarityLabel(result.rarity)}</p>
          <p className="font-display text-2xl">{result.name}</p>
          {result.lines.map((line) => (
            <p key={line} className="mt-1 text-sm">
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
