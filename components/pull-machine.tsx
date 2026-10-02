"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rarityLabel, type Rarity } from "@/lib/game";

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#fb7185", "#14b8a6", "#facc15"];

export function PullMachine({ points, cost, missing }: { points: number; cost: number; missing: number }) {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; rarity: Rarity } | null>(null);

  async function pull() {
    if (spinning || missing > 0) return;
    setSpinning(true);
    setError(null);
    setResult(null);
    const started = Date.now();
    const res = await fetch("/api/pull", { method: "POST" });
    const data = (await res.json()) as { error?: string; rewardName?: string; rarity?: Rarity };
    const wait = Math.max(0, 1300 - (Date.now() - started));
    await new Promise((resolve) => setTimeout(resolve, wait));
    setSpinning(false);
    if (!res.ok || !data.rewardName || !data.rarity) {
      setError(data.error ?? "La máquina no respondió.");
      return;
    }
    setResult({ name: data.rewardName, rarity: data.rarity });
    router.refresh();
  }

  return (
    <div className="machine rise-in">
      <div className="machine-globe">
        <div className={`capsules ${spinning ? "spinning" : ""}`}>
          {COLORS.map((color) => (
            <span key={color} className="capsule" style={{ background: `linear-gradient(180deg, white, ${color})` }} />
          ))}
        </div>
      </div>
      <div className="machine-body">
        <button type="button" className={`crank ${spinning ? "turning" : ""}`} disabled={spinning || missing > 0} onClick={() => void pull()} aria-label="Girar la manivela">
          <span />
        </button>
        <div className="coin-readout">
          <span>{points} pts</span>
          <span>{missing > 0 ? `faltan ${missing}` : `${cost} la ficha`}</span>
        </div>
        <div className="tray">
          {result ? (
            <div className="prize-drop text-center text-amber-100">
              <p className="text-[11px] font-bold uppercase">{rarityLabel(result.rarity)}</p>
              <p className="font-display text-xl">{result.name}</p>
            </div>
          ) : (
            <p className="text-xs font-semibold text-amber-200/80">{spinning ? "Girando…" : "Girá la rueda"}</p>
          )}
        </div>
        {error ? <p className="mt-2 text-center text-xs text-amber-100">{error}</p> : null}
      </div>
    </div>
  );
}
