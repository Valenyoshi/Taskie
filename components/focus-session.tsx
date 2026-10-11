"use client";

import { useEffect, useState } from "react";
import { HandExitIcon } from "@/components/hand-drawn-icons";

const CHOICES = [15, 25, 45];

export function FocusSession() {
  const [minutes, setMinutes] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          setRunning(false);
          setDone(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  function pick(next: number) {
    if (running) return;
    setMinutes(next);
    setLeft(next * 60);
    setDone(false);
  }

  function press() {
    if (left === 0) {
      setLeft(minutes * 60);
      setDone(false);
      setRunning(true);
      return;
    }
    setRunning((value) => !value);
  }

  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <section className="flex flex-col items-center gap-5 rounded-[28px] bg-card/90 px-5 py-8 text-center ring-1 ring-foreground/10">
      {/* Auriculares ilustrados estilo cuaderno */}
      <svg className="size-11 text-pine" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 18a11 11 0 0 1 22 0v5" />
        <rect x="3.5" y="17" width="5" height="9" rx="2.5" fill="currentColor" fillOpacity="0.2" />
        <rect x="23.5" y="17" width="5" height="9" rx="2.5" fill="currentColor" fillOpacity="0.2" />
        <path d="M8.5 21.5c1.5 2 4.5 3.5 7.5 3.5" strokeDasharray="1 2.5" />
      </svg>
      <p className="text-sm font-semibold text-muted-foreground">Un rato sin distracciones</p>
      <p className="font-display text-7xl leading-none">{clock}</p>
      <div className="flex gap-2">
        {CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={running}
            onClick={() => pick(choice)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-50 transition active:scale-95 ${
              choice === minutes ? "bg-pine text-white shadow-sm" : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            {choice} min
          </button>
        ))}
      </div>
      {done ? <p className="font-display text-2xl">Listo. Volvé a las tareas.</p> : null}
      <button type="button" onClick={press} className="h-12 rounded-full bg-coral px-8 font-semibold text-white shadow transition hover:opacity-95 active:scale-95">
        {running ? "Pausar" : left === 0 ? "Otra vez" : "Empezar"}
      </button>
    </section>
  );
}
