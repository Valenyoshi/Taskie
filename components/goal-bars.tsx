"use client";

import { useEffect, useRef, useState } from "react";

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
  const dayRef = useRef<HTMLElement>(null);
  const weekRef = useRef<HTMLElement>(null);
  const [boost, setBoost] = useState({ dayClosed: 0, dayTotal: 0, weekClosed: 0, weekTotal: 0 });
  const [check, setCheck] = useState({ day: false, week: false });
  const [confetti, setConfetti] = useState(false);
  const [bits, setBits] = useState<{ left: number; delay: number; color: string; drift: number; spin: number }[]>([]);

  useEffect(() => {
    function onDone(event: Event) {
      const detail = (event as CustomEvent<{ dueToday?: boolean; dueWeek?: boolean }>).detail ?? {};
      setBoost((current) => ({
        dayClosed: current.dayClosed + 1,
        dayTotal: current.dayTotal + (detail.dueToday ? 0 : 1),
        weekClosed: current.weekClosed + 1,
        weekTotal: current.weekTotal + (detail.dueWeek ? 0 : 1),
      }));
    }
    window.addEventListener("racha-task-done", onDone);
    return () => window.removeEventListener("racha-task-done", onDone);
  }, []);

  useEffect(() => {
    setBoost({ dayClosed: 0, dayTotal: 0, weekClosed: 0, weekTotal: 0 });
  }, [dailyClosed, dailyTotal, weeklyClosed, weeklyTotal]);

  const dayDone = dailyClosed + boost.dayClosed;
  const dayNeed = dailyTotal + boost.dayTotal;
  const weekDone = weeklyClosed + boost.weekClosed;
  const weekNeed = weeklyTotal + boost.weekTotal;

  useEffect(() => {
    const snapshot = `${dayDone}/${dayNeed}|${weekDone}/${weekNeed}`;
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
      const dayJust = prevDayTotal > 0 && prevDay < prevDayTotal && dayNeed > 0 && dayDone === dayNeed;
      const weekJust = prevWeekTotal > 0 && prevWeek < prevWeekTotal && weekNeed > 0 && weekDone === weekNeed;
      if (!dayJust && !weekJust) return;
      const target = (dayJust ? dayRef.current : weekRef.current) ?? dayRef.current;
      if (target) focusPage(target);
      setBits(
        Array.from({ length: 56 }, (_, index) => ({
          left: Math.round((index * 17) % 100),
          delay: (index % 8) * 0.04,
          color: COLORS[index % COLORS.length],
          drift: (index % 2 === 0 ? -1 : 1) * (12 + (index % 5) * 8),
          spin: 180 + (index % 6) * 60,
        })),
      );
      later(() => setConfetti(true), 820);
      later(() => setConfetti(false), 2500);
      later(() => setCheck({ day: dayJust, week: weekJust }), 2500);
      later(() => {
        setCheck({ day: false, week: false });
        releasePage();
      }, 3700);
    }, 40);
    return () => {
      alive = false;
      timers.forEach((id) => window.clearTimeout(id));
      if (document.documentElement.style.transform) releasePage();
    };
  }, [dayDone, dayNeed, weekDone, weekNeed]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <section ref={dayRef} className="zone zone-day rise-in">
          <Meter label="Hoy" done={dayDone} total={dayNeed} />
          {check.day ? <GoalCheck /> : null}
        </section>
        <section ref={weekRef} className="zone zone-week rise-in">
          <Meter label="Semana" done={weekDone} total={weekNeed} />
          {check.week ? <GoalCheck /> : null}
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

function focusPage(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const root = document.documentElement;
  root.style.transformOrigin = `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`;
  root.style.transition = "transform 0.85s cubic-bezier(0.22, 0.8, 0.28, 1)";
  root.style.transform = "scale(1.7)";
}

function releasePage() {
  const root = document.documentElement;
  root.style.transform = "scale(1)";
  window.setTimeout(() => {
    root.style.transition = "";
    root.style.transform = "";
    root.style.transformOrigin = "";
  }, 900);
}

function GoalCheck() {
  return (
    <div className="goal-check" aria-hidden>
      <span>✓</span>
    </div>
  );
}

function Meter({ label, done, total }: { label: string; done: number; total: number }) {
  const width = `${total ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : 0}%`;
  return (
    <div className="mt-3">
      <div className="mb-1.5 flex justify-between text-xs font-bold">
        <span>{label}</span>
        <span>{done}/{total}</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-white/35">
        <div className="meter-fill h-full rounded-full bg-white" style={{ width }} />
      </div>
    </div>
  );
}
