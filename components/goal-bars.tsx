"use client";

import { useEffect, useRef, useState } from "react";

type Metrics = {
  dayDone: number;
  dayNeed: number;
  weekDone: number;
  weekNeed: number;
};

type Celebration = { day: boolean; week: boolean };

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
  const [boost, setBoost] = useState({ dayClosed: 0, weekClosed: 0 });
  const [celebrating, setCelebrating] = useState<Celebration>({ day: false, week: false });
  const timers = useRef<{ day?: number; week?: number }>({});
  const firstMetrics = {
    dayDone: dailyClosed,
    dayNeed: dailyTotal,
    weekDone: weeklyClosed,
    weekNeed: weeklyTotal,
  };
  const previous = useRef<Metrics>(firstMetrics);

  useEffect(() => {
    function onDone(event: Event) {
      const detail = (event as CustomEvent<{ daily?: boolean; weekly?: boolean }>).detail ?? {};
      setBoost((current) => ({
        dayClosed: current.dayClosed + (detail.daily ? 1 : 0),
        weekClosed: current.weekClosed + (detail.weekly ? 1 : 0),
      }));
    }
    window.addEventListener("racha-task-done", onDone);
    return () => window.removeEventListener("racha-task-done", onDone);
  }, []);

  useEffect(() => {
    setBoost({ dayClosed: 0, weekClosed: 0 });
  }, [dailyClosed, dailyTotal, weeklyClosed, weeklyTotal]);

  useEffect(() => {
    const next: Metrics = {
      dayDone: dailyClosed + boost.dayClosed,
      dayNeed: dailyTotal,
      weekDone: weeklyClosed + boost.weekClosed,
      weekNeed: weeklyTotal,
    };
    const wasDayOpen = previous.current.dayNeed > 0 && previous.current.dayDone < previous.current.dayNeed;
    const wasWeekOpen = previous.current.weekNeed > 0 && previous.current.weekDone < previous.current.weekNeed;
    const dayJustCompleted = wasDayOpen && next.dayDone >= next.dayNeed;
    const weekJustCompleted = wasWeekOpen && next.weekDone >= next.weekNeed;

    if (dayJustCompleted || weekJustCompleted) {
      const nextCelebration = { day: dayJustCompleted, week: weekJustCompleted };
      setCelebrating((current) => ({ day: current.day || nextCelebration.day, week: current.week || nextCelebration.week }));
      if (dayJustCompleted) {
        window.clearTimeout(timers.current.day);
        timers.current.day = window.setTimeout(() => {
          setCelebrating((current) => ({ ...current, day: false }));
        }, 1150);
      }
      if (weekJustCompleted) {
        window.clearTimeout(timers.current.week);
        timers.current.week = window.setTimeout(() => {
          setCelebrating((current) => ({ ...current, week: false }));
        }, 1150);
      }
    }
    previous.current = next;
  }, [boost, dailyClosed, dailyTotal, weeklyClosed, weeklyTotal]);

  useEffect(
    () => () => {
      window.clearTimeout(timers.current.day);
      window.clearTimeout(timers.current.week);
    },
    [],
  );

  const metrics: Metrics = {
    dayDone: dailyClosed + boost.dayClosed,
    dayNeed: dailyTotal,
    weekDone: weeklyClosed + boost.weekClosed,
    weekNeed: weeklyTotal,
  };
  const bars = [
    { key: "day" as const, label: "Hoy", done: metrics.dayDone, total: metrics.dayNeed },
    { key: "week" as const, label: "Semana", done: metrics.weekDone, total: metrics.weekNeed },
  ].filter(({ key, done, total }) => celebrating[key] || (total > 0 && done < total));

  if (bars.length === 0) return null;

  return (
    <div className={bars.length === 1 ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
      {bars.map(({ key, label, done, total }) => (
        <section key={key} className={`zone ${key === "day" ? "zone-day" : "zone-week"} rise-in`}>
          <Meter label={label} done={done} total={total} />
          {celebrating[key] ? (
            <div className="goal-check" aria-label={`${label} completado`}>
              <span>✓</span>
            </div>
          ) : null}
        </section>
      ))}
    </div>
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
