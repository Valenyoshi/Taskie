"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarTask } from "@/lib/view";
import { cn } from "cn";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function parts(day: string): [number, number, number] {
  const [y, m, d] = day.split("-").map(Number);
  return [y, m, d];
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function monthTitle(y: number, m: number): string {
  const text = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dayName(day: string): string {
  const [y, m, d] = parts(day);
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

function hour(task: CalendarTask): string {
  return task.time && task.time !== "23:59" ? ` · ${task.time}` : "";
}

export function TaskCalendar({ tasks, today }: { tasks: CalendarTask[]; today: string }) {
  const [ty, tm] = parts(today);
  const [month, setMonth] = useState<[number, number]>([ty, tm]);
  const [selected, setSelected] = useState(today);
  const [y, m] = month;

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const task of tasks) map.set(task.day, [...(map.get(task.day) ?? []), task]);
    return map;
  }, [tasks]);

  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, i) => iso(y, m, i + 1))];
  while (cells.length % 7) cells.push(null);

  const move = (delta: number) => {
    const date = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth([date.getUTCFullYear(), date.getUTCMonth() + 1]);
  };

  const next = tasks.find((task) => task.status === "pending" && task.day >= today);
  const dayTasks = byDay.get(selected) ?? [];
  const pending = dayTasks.filter((task) => task.status === "pending");
  const done = dayTasks.filter((task) => task.status === "done");
  const heading = selected === today ? "Hoy" : dayName(selected);

  return (
    <section className="rounded-2xl bg-card px-3 py-3 ring-1 ring-foreground/10 sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-muted" onClick={() => move(-1)} aria-label="Mes anterior">
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display text-2xl leading-none">{monthTitle(y, m)}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {next ? `Próxima entrega: ${next.day === today ? "hoy" : dayName(next.day)}, ${next.subjectLabel}` : "No hay entregas pendientes"}
          </p>
        </div>
        <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-muted" onClick={() => move(1)} aria-label="Mes siguiente">
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground">
        {WEEKDAYS.map((day, index) => (
          <span key={index} className="py-1">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          if (!day) return <span key={index} />;
          const list = (byDay.get(day) ?? []).filter((task) => task.status === "pending");
          const late = list.some((task) => task.late);
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelected(day)}
              aria-pressed={selected === day}
              aria-label={`${dayName(day)}: ${list.length === 0 ? "sin entregas" : `${list.length} ${list.length === 1 ? "entrega" : "entregas"}`}`}
              className={cn(
                "calendar-day flex h-11 flex-col items-center justify-center rounded-lg text-sm sm:h-12",
                selected === day && "bg-primary text-primary-foreground",
                day === today && selected !== day && "font-bold underline decoration-2 underline-offset-4",
              )}
            >
              <span className={cn("leading-none", late && selected !== day && "text-destructive")}>{Number(day.slice(8))}</span>
              <span className="mt-1 flex h-1.5 items-center gap-0.5">
                {list.slice(0, 3).map((task) => (
                  <span key={task.id} className="size-1.5 rounded-full" style={{ background: selected === day ? "currentColor" : task.color }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      {y !== ty || m !== tm ? (
        <button
          type="button"
          className="mx-auto mt-1 block text-sm font-semibold text-primary"
          onClick={() => {
            setMonth([ty, tm]);
            setSelected(today);
          }}
        >
          Volver a hoy
        </button>
      ) : null}

      <div className="mt-2 border-t border-border pt-2">
        <p className="px-1 text-sm font-semibold">{heading}</p>
        {pending.length === 0 && done.length === 0 ? <p className="px-1 py-1 text-sm text-muted-foreground">Nada para entregar.</p> : null}
        {pending.map((task) => (
          <TaskLine key={task.id} task={task} />
        ))}
        {done.map((task) => (
          <TaskLine key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
}

function TaskLine({ task }: { task: CalendarTask }) {
  const text = (
    <>
      <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: task.color }} aria-hidden />
      <span className={cn("min-w-0 text-sm", task.status === "done" && "text-muted-foreground line-through")}>
        <b className="font-semibold">{task.subjectLabel}.</b> {task.title}
        {task.status === "pending" ? hour(task) : ""}
        {task.late ? <span className="font-semibold text-destructive"> · atrasada</span> : null}
      </span>
    </>
  );
  const className = "flex items-start gap-2 rounded-lg px-1 py-1.5";
  return task.url && task.status === "pending" ? (
    <a href={task.url} target="_blank" rel="noopener noreferrer" className={cn(className, "hover:bg-muted")}>
      {text}
    </a>
  ) : (
    <div className={className}>{text}</div>
  );
}
