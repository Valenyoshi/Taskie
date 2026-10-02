"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SchoolIcon } from "@/components/school-icon";
import { REWARDS } from "@/lib/catalog";
import { rarityLabel, type Rarity } from "@/lib/game";

type Spot = { x: number; y: number; r: number };

function scatter(): Spot[] {
  return REWARDS.slice(0, 8).map(() => ({
    x: 6 + Math.random() * 62,
    y: 8 + Math.random() * 58,
    r: Math.random() * 50 - 25,
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
    const timer = window.setInterval(() => setSpots(scatter()), 140);
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
    <div className="cab rise-in">
      <div className="cab-lights" aria-hidden>
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className="bulb" style={{ animationDelay: `${index * 0.12}s` }} />
        ))}
      </div>
      <div className="dome-wrap">
        {pieces.map((piece, index) => (
          <span
            key={piece.id}
            className="capsule-float"
            style={{
              left: `${spots[index]?.x ?? 10}%`,
              top: `${spots[index]?.y ?? 12}%`,
              transform: `rotate(${spots[index]?.r ?? 0}deg)`,
            }}
          >
            <SchoolIcon id={piece.id} size={32} />
          </span>
        ))}
        <div className="dome-floor" />
      </div>
      <div className="cab-panel">
        <div className="wheel-mount">
          <span className="wheel-axle" aria-hidden />
          <button type="button" className={`wheel ${spinning ? "turning" : ""}`} disabled={spinning || missing > 0} onClick={() => void pull()} aria-label="Girar la rueda">
            <i />
          </button>
        </div>
        <div className="cab-readout">
          <span>{points} pts</span>
          <span>{missing > 0 ? `faltan ${missing}` : `${cost}`}</span>
        </div>
        <div className="cab-chute">
          {result ? (
            <div className="prize-drop text-center">
              <SchoolIcon id={result.id} size={42} />
              <p className="text-[11px] font-bold uppercase">{rarityLabel(result.rarity)}</p>
              <p className="font-display text-lg">{result.name}</p>
            </div>
          ) : (
            <p className="text-xs font-semibold">{spinning ? "Girando…" : "Girá la rueda"}</p>
          )}
        </div>
        {error ? <p className="mt-2 text-center text-xs text-amber-100">{error}</p> : null}
      </div>
      <div className="cab-lights" aria-hidden>
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className="bulb" style={{ animationDelay: `${index * 0.12 + 0.4}s` }} />
        ))}
      </div>
    </div>
  );
}
