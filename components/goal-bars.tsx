"use client";

import { useEffect, useState } from "react";

const COLORS = ["#e25b45", "#e8a317", "#1c7c6e", "#fff6d8", "#f3c04a"];

export function GoalBars({
  dailyClosed,
  dailyTotal,
  weeklyClosed,
  weeklyTotal,
}: {
  dailyClosed: number;
  dailyTotal: number;
  weeklyClosed: number;
  weeklyTotal: number;
}) {
  const [zoom, setZoom] = useState({ day: false, week: false });
  const [confetti, setConfetti] = useState(false);
  const [bits, setBits] = useState<{ left: number; delay: number; color: string; drift: number; spin: number }[]>([]);

  useEffect(() => {
    const snapshot = `${dailyClosed}/${dailyTotal}|${weeklyClosed}/${weeklyTotal}`;
    let alive = true;
    const timers: number[] = [];
    const later = (run: () => void, ms: number) => {
      timers.push(window.setTimeout(() => {
        if (alive) run();
      }, ms));
    };
    later(() => {
      const previous = sessionStorage.getItem("racha-goals");
      sessionStorage.setItem("racha-goals", snapshot);
      if (!previous || previous === snapshot) return;
      const [dayPart, weekPart] = previous.split("|");
      const [prevDay, prevDayTotal] = (dayPart ?? "0/0").split("/").map(Number);
      const [prevWeek, prevWeekTotal] = (weekPart ?? "0/0").split("/").map(Number);
      const dayJust = prevDayTotal > 0 && prevDay < prevDayTotal && dailyTotal > 0 && dailyClosed === dailyTotal;
      const weekJust = prevWeekTotal > 0 && prevWeek < prevWeekTotal && weeklyTotal > 0 && weeklyClosed === weeklyTotal;
      if (!dayJust && !weekJust) return;
      setZoom({ day: dayJust, week: weekJust });
      setBits(
        Array.from({ length: 56 }, (_, index) => ({
          left: Math.round((index * 17) % 100),
          delay: (index % 8) * 0.04,
          color: COLORS[index % COLORS.length],
          drift: (index % 2 === 0 ? -1 : 1) * (12 + (index % 5) * 8),
          spin: 180 + (index % 6) * 60,
        })),
      );
      later(() => setConfetti(true), 420);
      later(() => setZoom({ day: false, week: false }), 900);
      later(() => setConfetti(false), 2300);
    }, 40);
    return () => {
      alive = false;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [dailyClosed, dailyTotal, weeklyClosed, weeklyTotal]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <section className={`zone zone-day rise-in ${zoom.day ? "goal-zoom" : ""}`}>
          <Meter label="Hoy" done={dailyClosed} total={dailyTotal} />
        </section>
        <section className={`zone zone-week rise-in ${zoom.week ? "goal-zoom" : ""}`}>
          <Meter label="Semana" done={weeklyClosed} total={weeklyTotal} />
        </section>
      </div>
      {confetti ? (
        <div className="confetti-screen" aria-hidden>
          {bits.map((bit, index) => (
            <span
              key={index}
              className="confetti-bit"
              style={{
                left: `${bit.left}%`,
                background: bit.color,
                animationDelay: `${bit.delay}s`,
                ["--drift" as string]: `${bit.drift}px`,
                ["--spin" as string]: `${bit.spin}deg`,
              }}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

function Meter({ label, done, total }: { label: string; done: number; total: number }) {
  const width = `${total ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : 0}%`;
  return (
    <div className="mt-3">
      <div className="mb-1.5 flex justify-between text-xs font-bold">
        <span>{label}</span>
        <span>{total ? `${done}/${total}` : "—"}</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-white/35">
        <div className="meter-fill h-full rounded-full bg-white" style={{ width }} />
      </div>
    </div>
  );
}
