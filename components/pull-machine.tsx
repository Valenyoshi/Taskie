"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SchoolIcon } from "@/components/school-icon";
import { REWARDS } from "@/lib/catalog";
import { rarityLabel, type Rarity } from "@/lib/game";

const PILE = [
  { x: 8, y: 58 },
  { x: 30, y: 62 },
  { x: 52, y: 56 },
  { x: 70, y: 64 },
  { x: 18, y: 38 },
  { x: 40, y: 34 },
  { x: 60, y: 40 },
  { x: 36, y: 18 },
];

type Phase = "idle" | "coin" | "tumble" | "drop";

function Lights({ delay = 0 }: { delay?: number }) {
  return (
    <div className="gacha-lights" aria-hidden>
      {Array.from({ length: 8 }, (_, index) => (
        <span key={index} className="bulb" style={{ animationDelay: `${index * 0.12 + delay}s` }} />
      ))}
    </div>
  );
}

function Capsule({ id, hot, delay }: { id: string; hot: boolean; delay: number }) {
  return (
    <div className={`cap ${hot ? "hot" : ""}`} style={{ animationDelay: `${delay}s` }}>
      <div className="cap-prize">
        <SchoolIcon id={id} size={28} />
      </div>
      <div className="cap-shell" />
    </div>
  );
}

export function PullMachine({ points, cost, missing }: { points: number; cost: number; missing: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; name: string; rarity: Rarity } | null>(null);
  const pile = REWARDS.slice(0, 8);

  async function pull() {
    if (phase !== "idle" || missing > 0) return;
    setError(null);
    setResult(null);
    setPhase("coin");
    const res = await fetch("/api/pull", { method: "POST" });
    const data = (await res.json()) as { error?: string; rewardName?: string; rarity?: Rarity };
    await new Promise((resolve) => setTimeout(resolve, 720));
    setPhase("tumble");
    await new Promise((resolve) => setTimeout(resolve, 1100));
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
    <div className="gacha rise-in">
      <Lights />
      <div className="gacha-globe">
        {pile.map((piece, index) => (
          <div key={piece.id} className="absolute" style={{ left: `${PILE[index].x}%`, top: `${PILE[index].y}%` }}>
            <Capsule id={piece.id} hot={phase === "tumble"} delay={index * 0.15} />
          </div>
        ))}
      </div>
      <div className="gacha-base">
        <button type="button" className="coin-slot" disabled={phase !== "idle" || missing > 0} onClick={() => void pull()}>
          <span className={`coin ${phase === "coin" ? "inserting" : ""}`} />
          <span className="slot-label">{missing > 0 ? `Faltan ${missing}` : phase === "idle" ? `${points} pts · meté la moneda` : "Entrando…"}</span>
        </button>
        <div className="chute">
          {result && phase === "drop" ? (
            <div className="text-center">
              <div className="out-ball">
                <div className="cap-prize">
                  <SchoolIcon id={result.id} size={36} />
                </div>
                <div className="cap-shell" />
              </div>
              <p className="mt-1 text-xs font-bold text-foreground">
                {rarityLabel(result.rarity)} · {result.name}
              </p>
            </div>
          ) : (
            <p className="text-xs font-semibold text-muted-foreground">{phase === "tumble" ? "Se mueven…" : "La bolita sale acá"}</p>
          )}
        </div>
        {error ? <p className="mt-2 text-center text-xs font-semibold text-coral">{error}</p> : null}
        <div className="gacha-odds">
          <Lights delay={0.2} />
          <p className="text-center font-display text-lg">Probabilidades</p>
          <div className="odds-row"><span>Común</span><span>60%</span></div>
          <div className="odds-row"><span>Raro</span><span>32%</span></div>
          <div className="odds-row"><span>Súper raro</span><span>8%</span></div>
          <p className="mt-1 text-center text-xs text-muted-foreground">Cada giro cuesta {cost} puntos.</p>
        </div>
      </div>
      <Lights delay={0.45} />
    </div>
  );
}
