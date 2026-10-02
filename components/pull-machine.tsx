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
    <section className="rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-4 text-white">
      <p className="font-display text-4xl">{points}</p>
      <p className="mt-1 text-sm font-semibold">Tirada {cost}</p>
      <div className="mt-2 flex gap-2 text-xs font-bold">
        <span className="rounded-full bg-white/30 px-2 py-1">60 común</span>
        <span className="rounded-full bg-violet-700/70 px-2 py-1">32 raro</span>
        <span className="rounded-full bg-amber-200 px-2 py-1 text-amber-950">8 súper</span>
      </div>
      <Button className="mt-4 h-12 w-full bg-white text-base text-orange-700 hover:bg-white/90 disabled:bg-white/80 disabled:opacity-100" disabled={busy || missing > 0} onClick={() => void pull()}>
        {busy ? "…" : missing > 0 ? `Faltan ${missing}` : "Tirar"}
      </Button>
      {error ? <p className="mt-3 text-sm">{error}</p> : null}
      {result ? (
        <div className="mt-4 rounded-2xl bg-white p-4 text-orange-950">
          <p className="text-xs font-bold uppercase">{rarityLabel(result.rarity)}</p>
          <p className="font-display text-2xl">{result.name}</p>
        </div>
      ) : null}
    </section>
  );
}
