"use client";

import { useEffect, useState } from "react";
import { Headphones } from "lucide-react";

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
      <Headphones className="size-10 text-pine" aria-hidden />
      <p className="text-sm font-semibold text-muted-foreground">Un rato sin distracciones</p>
      <p className="font-display text-7xl leading-none">{clock}</p>
      <div className="flex gap-2">
        {CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={running}
            onClick={() => pick(choice)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
              choice === minutes ? "bg-pine text-white" : "bg-muted text-foreground"
            }`}
          >
            {choice} min
          </button>
        ))}
      </div>
      {done ? <p className="font-display text-2xl">Listo. Volvé a las tareas.</p> : null}
      <button type="button" onClick={press} className="h-12 rounded-full bg-coral px-8 font-semibold text-white">
        {running ? "Pausar" : left === 0 ? "Otra vez" : "Empezar"}
      </button>
    </section>
  );
}
