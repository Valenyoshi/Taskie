"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SchoolIcon } from "@/components/school-icon";
import { REWARDS } from "@/lib/catalog";
import { rarityLabel, type Rarity } from "@/lib/game";

const BALLS = ["var(--coral)", "var(--gold)", "var(--pine)", "#d6d3d1", "var(--coral)", "var(--gold)", "var(--pine)", "#eeeae4"];

type Spot = { x: number; y: number };
type Phase = "idle" | "coin" | "tumble" | "drop";

function scatter(): Spot[] {
  return BALLS.map(() => ({
    x: 8 + Math.random() * 68,
    y: 18 + Math.random() * 58,
  }));
}

export function PullMachine({ points, cost, missing }: { points: number; cost: number; missing: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [spots, setSpots] = useState<Spot[]>(scatter);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; name: string; rarity: Rarity } | null>(null);

  useEffect(() => {
    if (phase !== "tumble") return;
    const timer = window.setInterval(() => setSpots(scatter()), 140);
    return () => window.clearInterval(timer);
  }, [phase]);

  async function pull() {
    if (phase !== "idle" || missing > 0) return;
    setError(null);
    setResult(null);
    setPhase("coin");
    const res = await fetch("/api/pull", { method: "POST" });
    const data = (await res.json()) as { error?: string; rewardName?: string; rarity?: Rarity };
    await new Promise((resolve) => setTimeout(resolve, 700));
    setPhase("tumble");
    await new Promise((resolve) => setTimeout(resolve, 900));
    if (!res.ok || !data.rewardName || !data.rarity) {
      setPhase("idle");
      setError(data.error ?? "La máquina no respondió.");
      return;
    }
    const found = REWARDS.find((reward) => reward.name === data.rewardName);
    setResult({ id: found?.id ?? "lapiz", name: data.rewardName, rarity: data.rarity });
    setPhase("drop");
    router.refresh();
  }

  return (
    <div>
      <div className="gacha rise-in">
        <div className="gacha-lights" aria-hidden>
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} className="bulb" style={{ animationDelay: `${index * 0.12}s` }} />
          ))}
        </div>
        <div className="gacha-globe">
          {BALLS.map((color, index) => (
            <span
              key={color + index}
              className="gacha-ball"
              style={{ left: `${spots[index]?.x ?? 20}%`, top: `${spots[index]?.y ?? 30}%`, background: color }}
            />
          ))}
        </div>
        <div className="gacha-base">
          <button type="button" className="coin-slot" disabled={phase !== "idle" || missing > 0} onClick={() => void pull()}>
            <span className={`coin ${phase === "coin" ? "inserting" : ""}`} />
            <span className="text-xs font-semibold text-gold">
              {missing > 0 ? `Faltan ${missing}` : phase === "idle" ? `${points} pts` : "…"}
            </span>
          </button>
          <div className="chute">
            {result && phase === "drop" ? (
              <div className="out-ball">
                <SchoolIcon id={result.id} size={36} />
              </div>
            ) : (
              <p className="text-xs font-semibold text-gold">{phase === "idle" ? "Meté la moneda" : "Girando…"}</p>
            )}
          </div>
          {result && phase === "drop" ? (
            <p className="mt-2 text-center text-xs font-bold text-white">
              {rarityLabel(result.rarity)} · {result.name}
            </p>
          ) : null}
          {error ? <p className="mt-2 text-center text-xs text-gold">{error}</p> : null}
        </div>
        <div className="gacha-lights" aria-hidden>
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} className="bulb" style={{ animationDelay: `${index * 0.12 + 0.4}s` }} />
          ))}
        </div>
      </div>
      <aside className="odds">
        <p className="font-display text-lg">Probabilidades</p>
        <div className="odds-row"><span>Común</span><span>60%</span></div>
        <div className="odds-row"><span>Raro</span><span>32%</span></div>
        <div className="odds-row"><span>Súper raro</span><span>8%</span></div>
        <p className="mt-2 text-xs text-muted-foreground">Cada giro cuesta {cost} puntos.</p>
      </aside>
    </div>
  );
}
