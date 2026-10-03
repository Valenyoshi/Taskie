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
  const dayRef = useRef<HTMLElement>(null);
  const weekRef = useRef<HTMLElement>(null);
  const [boost, setBoost] = useState({ dayClosed: 0, dayTotal: 0, weekClosed: 0, weekTotal: 0 });
  const [check, setCheck] = useState({ day: false, week: false });
  const [leaving, setLeaving] = useState({ day: false, week: false });
  const [gone, setGone] = useState({ day: false, week: false });
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
      const previous = sessionStorage.getItem("racha-goals");
      sessionStorage.setItem("racha-goals", snapshot);
      if (!previous || previous === snapshot) {
        setShown(next);
        setGone({
          day: dayNeed > 0 && dayDone === dayNeed,
          week: weekNeed > 0 && weekDone === weekNeed,
        });
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
      later(() => setShown(next), 900);
      later(() => {
        setCheck({ day: dayJust, week: weekJust });
        setConfetti(true);
      }, 1800);
      later(() => setLeaving({ day: dayJust, week: weekJust }), 4200);
      later(() => {
        setGone((current) => ({ day: current.day || dayJust, week: current.week || weekJust }));
        setConfetti(false);
        party.current = false;
        releasePage();
      }, 5200);
    }, 40);
  }, [dayDone, dayNeed, weekDone, weekNeed]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {gone.day ? <div /> : (
          <section ref={dayRef} className={`zone zone-day rise-in ${leaving.day ? "task-leave" : ""}`}>
            <Meter label="Hoy" done={shown.dayDone} total={shown.dayNeed} />
            {check.day ? (
              <div className="card-cover" aria-hidden>
                <span className="card-cover-mark">✓</span>
              </div>
            ) : null}
          </section>
        )}
        {gone.week ? <div /> : (
          <section ref={weekRef} className={`zone zone-week rise-in ${leaving.week ? "task-leave" : ""}`}>
            <Meter label="Semana" done={shown.weekDone} total={shown.weekNeed} />
            {check.week ? (
              <div className="card-cover" aria-hidden>
                <span className="card-cover-mark">✓</span>
              </div>
            ) : null}
          </section>
        )}
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

function pageRoot(): HTMLElement {
  return document.querySelector("[data-theme]") ?? document.body;
}

function focusPage(el: HTMLElement) {
  const root = pageRoot();
  const rect = el.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  const x = rect.left - rootRect.left + rect.width / 2;
  const y = rect.top - rootRect.top + rect.height / 2;
  const cover = Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height) * 1.08;
  root.style.transformOrigin = `${x}px ${y}px`;
  root.style.transition = "transform 0.85s cubic-bezier(0.22, 0.8, 0.28, 1)";
  root.style.transform = `scale(${cover})`;
}

function releasePage() {
  const root = pageRoot();
  root.style.transform = "scale(1)";
  window.setTimeout(() => {
    root.style.transition = "";
    root.style.transform = "";
    root.style.transformOrigin = "";
  }, 900);
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
