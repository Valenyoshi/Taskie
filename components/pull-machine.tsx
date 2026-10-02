"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SchoolIcon } from "@/components/school-icon";
import { REWARDS } from "@/lib/catalog";
import { rarityLabel, type Rarity } from "@/lib/game";

type Spot = { x: number; y: number; r: number };

function scatter(): Spot[] {
  return REWARDS.slice(0, 8).map(() => ({
    x: 8 + Math.random() * 68,
    y: 8 + Math.random() * 62,
    r: Math.random() * 80 - 40,
  }));
}

export function PullMachine({ points, cost, missing }: { points: number; cost: number; missing: number }) {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);
  const [spots, setSpots] = useState<Spot[]>(scatter);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; name: string; rarity: Rarity } | null>(null);
  const pieces = REWARDS.slice(0, 8);

  useEffect(() => {
    if (!spinning) return;
    const timer = window.setInterval(() => setSpots(scatter()), 160);
    return () => window.clearInterval(timer);
  }, [spinning]);

  async function pull() {
    if (spinning || missing > 0) return;
    setSpinning(true);
    setError(null);
    setResult(null);
    const started = Date.now();
    const res = await fetch("/api/pull", { method: "POST" });
    const data = (await res.json()) as { error?: string; rewardName?: string; rarity?: Rarity };
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 1600 - (Date.now() - started))));
    setSpinning(false);
    if (!res.ok || !data.rewardName || !data.rarity) {
      setError(data.error ?? "La máquina no respondió.");
      return;
    }
    const found = REWARDS.find((reward) => reward.name === data.rewardName);
    setResult({ id: found?.id ?? "lapiz", name: data.rewardName, rarity: data.rarity });
    router.refresh();
  }

  return (
    <div className="machine rise-in">
      <div className="machine-globe">
        <div className="capsules">
          {pieces.map((piece, index) => (
            <span
              key={piece.id}
              className="capsule-float"
              style={{
                left: `${spots[index]?.x ?? 10}%`,
                top: `${spots[index]?.y ?? 10}%`,
                transform: `rotate(${spots[index]?.r ?? 0}deg)`,
              }}
            >
              <SchoolIcon id={piece.id} size={34} />
            </span>
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
              <SchoolIcon id={result.id} size={46} />
              <p className="text-[11px] font-bold uppercase">{rarityLabel(result.rarity)}</p>
              <p className="font-display text-lg">{result.name}</p>
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
