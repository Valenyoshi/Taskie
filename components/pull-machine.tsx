"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CountUp } from "@/components/count-up";
import { SchoolIcon } from "@/components/school-icon";
import { REWARDS } from "@/lib/catalog";
import { rarityLabel, type Rarity } from "@/lib/game";

const TINTS = ["#ffb4a8", "#ffe08a", "#9ad8cc", "#b9d0ff", "#f5b6d6", "#d4c4ff", "#b7e3a1", "#ffc9a0"];
const PILE = [
  { x: 6, y: 62 },
  { x: 28, y: 66 },
  { x: 50, y: 62 },
  { x: 70, y: 68 },
  { x: 16, y: 46 },
  { x: 40, y: 44 },
  { x: 62, y: 48 },
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

export function PullMachine({ points, cost, missing }: { points: number; cost: number; missing: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; name: string; rarity: Rarity } | null>(null);
  const pile = REWARDS.slice(0, PILE.length);
  const busy = phase === "coin" || phase === "tumble";

  async function pull() {
    if (busy || missing > 0) return;
    setError(null);
    setResult(null);
    setPhase("coin");
    let res: Response;
    let data: { error?: string; rewardName?: string; rarity?: Rarity };
    try {
      res = await fetch("/api/pull", { method: "POST" });
      data = (await res.json()) as { error?: string; rewardName?: string; rarity?: Rarity };
    } catch {
      setPhase("idle");
      setError("La máquina no respondió.");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 900));
    setPhase("tumble");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!res.ok || !data.rewardName || !data.rarity) {
      setPhase("idle");
      setError(data.error ?? "La máquina no respondió.");
      return;
    }
    const found = REWARDS.find((reward) => reward.name === data.rewardName);
    setResult({ id: found?.id ?? "lapiz", name: data.rewardName, rarity: data.rarity });
    setPhase("drop");
    router.refresh();
    window.setTimeout(() => setPhase("idle"), 1600);
  }

  return (
    <div className="gacha rise-in">
      <Lights />
      <div className={`gacha-globe ${phase === "tumble" ? "shaking" : ""}`}>
        {pile.map((piece, index) => (
          <div key={piece.id} className="absolute" style={{ left: `${PILE[index].x}%`, top: `${PILE[index].y}%` }}>
            <div className={`cap ${phase === "tumble" ? "hot" : ""}`} style={{ animationDelay: `${index * 0.07}s` }}>
              <div className="cap-prize">
                <SchoolIcon id={piece.id} size={26} />
              </div>
              <div className="cap-shell" style={{ backgroundColor: `${TINTS[index]}99`, borderColor: TINTS[index] }} />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="hatch-button"
        disabled={busy || missing > 0}
        onClick={() => void pull()}
        aria-label={`Meter una moneda de ${cost} puntos`}
      >
        <div className={`hatch ${phase === "drop" ? "open" : ""} ${phase === "coin" ? "feeding" : ""}`} aria-hidden>
          <span className="hatch-half top" />
          <span className="hatch-half bot" />
          <span
            className={`coin hatch-coin ${phase === "coin" ? "inserting" : ""} ${phase === "tumble" || phase === "drop" ? "gone" : ""}`}
          />
          <span className="hatch-line" />
        </div>
      </button>
      <div className="gacha-base">
        <div className="points-corral machine">
          <span className="points-coin" aria-hidden />
          <span>
            <span className="points-value">{missing > 0 ? missing : <CountUp value={points} />}</span>
            <span className="points-label">{missing > 0 ? "faltan" : "puntos"}</span>
          </span>
        </div>
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
            <p className="text-xs font-semibold text-muted-foreground">{phase === "tumble" ? "Se mueven…" : "Sale por acá"}</p>
          )}
        </div>
        {error ? <p className="mt-2 text-center text-xs font-semibold text-coral">{error}</p> : null}
        <div className="gacha-odds">
          <Lights delay={0.2} />
          <p className="text-center font-display text-lg">Probabilidades</p>
          <div className="odds-row"><span>Común</span><span>60%</span></div>
          <div className="odds-row"><span>Raro</span><span>32%</span></div>
          <div className="odds-row"><span>Súper raro</span><span>8%</span></div>
        </div>
      </div>
      <Lights delay={0.45} />
    </div>
  );
}
