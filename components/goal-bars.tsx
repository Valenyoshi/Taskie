"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const [boost, setBoost] = useState({ dayClosed: 0, dayTotal: 0, weekClosed: 0, weekTotal: 0 });
  const [confetti, setConfetti] = useState(false);
  const [bits, setBits] = useState<{ left: number; delay: number; color: string; drift: number; spin: number }[]>([]);

  useEffect(() => {
    function onDone(event: Event) {
      const detail = (event as CustomEvent<{ daily?: boolean; weekly?: boolean }>).detail ?? {};
      setBoost((current) => ({
        dayClosed: current.dayClosed + (detail.daily ? 1 : 0),
        dayTotal: current.dayTotal,
        weekClosed: current.weekClosed + (detail.weekly ? 1 : 0),
        weekTotal: current.weekTotal,
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
  const [shown, setShown] = useState({ dayDone, dayNeed, weekDone, weekNeed });
  const party = useRef(false);

  useEffect(() => {
    const snapshot = `${dayDone}/${dayNeed}|${weekDone}/${weekNeed}`;
    const next = { dayDone, dayNeed, weekDone, weekNeed };
    if (party.current) return;
    const later = (run: () => void, ms: number) => {
      window.setTimeout(run, ms);
    };
    later(() => {
      if (party.current) return;
      const date = new Date().toLocaleDateString("en-CA");
      const packed = `${date}|${snapshot}`;
      const raw = sessionStorage.getItem("racha-goals");
      sessionStorage.setItem("racha-goals", packed);
      const previous = raw?.startsWith(`${date}|`) ? raw.slice(date.length + 1) : null;
      if (!previous || previous === snapshot) {
        setShown(next);
        return;
      }
      const [dayPart, weekPart] = previous.split("|");
      const [prevDay, prevDayTotal] = (dayPart ?? "0/0").split("/").map(Number);
      const [prevWeek, prevWeekTotal] = (weekPart ?? "0/0").split("/").map(Number);
      const dayJust = prevDayTotal > 0 && prevDay < prevDayTotal && dayNeed > 0 && dayDone === dayNeed;
      const weekJust = prevWeekTotal > 0 && prevWeek < prevWeekTotal && weekNeed > 0 && weekDone === weekNeed;
      if (!dayJust && !weekJust) {
        setShown(next);
        return;
      }
      party.current = true;
      setBits(
        Array.from({ length: 56 }, (_, index) => ({
          left: Math.round((index * 17) % 100),
          delay: (index % 8) * 0.04,
          color: COLORS[index % COLORS.length],
          drift: (index % 2 === 0 ? -1 : 1) * (12 + (index % 5) * 8),
          spin: 180 + (index % 6) * 60,
        })),
      );
      later(() => setShown(next), 900);
      later(() => {
        setConfetti(true);
      }, 1800);
      later(() => {
        setConfetti(false);
        party.current = false;
      }, 4200);
    }, 40);
  }, [dayDone, dayNeed, weekDone, weekNeed]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <section className="zone zone-day rise-in">
          <Meter label="Hoy" done={shown.dayDone} total={shown.dayNeed} />
        </section>
        <section className="zone zone-week rise-in">
          <Meter label="Semana" done={shown.weekDone} total={shown.weekNeed} />
        </section>
      </div>
      {confetti
        ? createPortal(
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
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Meter({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number;
}) {
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
