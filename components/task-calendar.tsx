"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SchoolNews } from "@/lib/educamos";
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

function dayTitle(day: string, today: string): string {
  const [y, m, d] = parts(day);
  const text = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
  const label = text.charAt(0).toUpperCase() + text.slice(1);
  return day === today ? `Hoy, ${text}` : label;
}

function status(task: CalendarTask): { label: string; tone: string } {
  if (task.status === "done") return { label: "Hecha", tone: "bg-emerald-100 text-emerald-800" };
  if (task.late) return { label: "Atrasada", tone: "bg-destructive/10 text-destructive" };
  return { label: `Vence ${task.time} h`, tone: "bg-amber-100 text-amber-900" };
}

function TaskRow({ task, showDay, today }: { task: CalendarTask; showDay?: boolean; today: string }) {
  const chip = status(task);
  const body = (
    <>
      <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: task.color }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-muted-foreground">
          {task.subjectLabel}
          {showDay ? ` · ${dayTitle(task.day, today)}` : ""}
        </span>
        <span className={cn("block text-sm font-medium", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</span>
      </span>
      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", chip.tone)}>{chip.label}</span>
    </>
  );
  return task.url ? (
    <a href={task.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-muted">
      {body}
    </a>
  ) : (
    <div className="flex items-start gap-3 rounded-xl px-2 py-2">{body}</div>
  );
}

export function TaskCalendar({
  tasks,
  today,
  news,
  onOpenNews,
}: {
  tasks: CalendarTask[];
  today: string;
  news: SchoolNews[];
  onOpenNews: () => void;
}) {
  const [ty, tm] = parts(today);
  const [month, setMonth] = useState<[number, number]>([ty, tm]);
  const [selected, setSelected] = useState(today);
  const [y, m] = month;

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const task of tasks) map.set(task.day, [...(map.get(task.day) ?? []), task]);
    return map;
  }, [tasks]);
  const newsByDay = useMemo(() => {
    const map = new Map<string, SchoolNews[]>();
    for (const item of news) if (item.start) map.set(item.start, [...(map.get(item.start) ?? []), item]);
    return map;
  }, [news]);

  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, i) => iso(y, m, i + 1))];
  while (cells.length % 7) cells.push(null);

  const move = (delta: number) => {
    const date = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth([date.getUTCFullYear(), date.getUTCMonth() + 1]);
  };
  const monthKey = iso(y, m, 1).slice(0, 7);
  const inMonth = tasks.filter((task) => task.day.startsWith(monthKey));
  const pendingInMonth = inMonth.filter((task) => task.status === "pending").length;
  const upcoming = tasks.filter((task) => task.status === "pending" && task.day >= today).slice(0, 6);
  const dayTasks = byDay.get(selected) ?? [];
  const dayNews = newsByDay.get(selected) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-2xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" onClick={() => move(-1)} aria-label="Mes anterior">
            <ChevronLeft />
          </Button>
          <div className="text-center">
            <p className="font-display text-2xl leading-none">{monthTitle(y, m)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {inMonth.length === 0 ? "Sin entregas" : `${inMonth.length} ${inMonth.length === 1 ? "entrega" : "entregas"} · ${pendingInMonth} sin hacer`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => move(1)} aria-label="Mes siguiente">
            <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
          {WEEKDAYS.map((day, index) => (
            <span key={index} className="py-1">
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            if (!day) return <span key={index} />;
            const list = byDay.get(day) ?? [];
            const hasNews = newsByDay.has(day);
            const late = list.some((task) => task.late);
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                aria-pressed={selected === day}
                aria-label={`${dayTitle(day, today)}: ${list.length} ${list.length === 1 ? "entrega" : "entregas"}${hasNews ? ", con noticia" : ""}`}
                className={cn(
                  "calendar-day relative flex aspect-square flex-col items-center justify-start rounded-xl pt-1 text-sm transition-colors sm:aspect-auto sm:h-14 sm:pt-1.5",
                  selected === day ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  day === today && selected !== day && "ring-2 ring-primary/60",
                )}
              >
                <span className={cn("font-semibold leading-none", late && selected !== day && "text-destructive")}>{Number(day.slice(8))}</span>
                <span className="mt-auto mb-1 flex items-center gap-0.5">
                  {list.slice(0, 3).map((task) => (
                    <span
                      key={task.id}
                      className={cn("size-1.5 rounded-full sm:size-2", task.status === "done" && "opacity-40")}
                      style={{ background: selected === day ? "currentColor" : task.color }}
                    />
                  ))}
                  {list.length > 3 ? <span className="text-[9px] leading-none">+{list.length - 3}</span> : null}
                </span>
                {hasNews ? <Megaphone className="absolute top-0.5 right-0.5 size-2.5 sm:size-3" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
        {y !== ty || m !== tm ? (
          <div className="mt-2 text-center">
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setMonth([ty, tm]);
                setSelected(today);
              }}
            >
              Volver a hoy
            </Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl bg-card px-3 py-3 ring-1 ring-foreground/10 sm:px-4">
        <h3 className="px-2 font-display text-xl">{dayTitle(selected, today)}</h3>
        {dayTasks.length === 0 && dayNews.length === 0 ? (
          <p className="px-2 py-2 text-sm text-muted-foreground">No hay entregas para este día.</p>
        ) : (
          <div className="mt-1 flex flex-col">
            {dayTasks.map((task) => (
              <TaskRow key={task.id} task={task} today={today} />
            ))}
            {dayNews.map((item) => (
              <button key={item.id} type="button" onClick={onOpenNews} className="flex items-start gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted">
                <Megaphone className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-muted-foreground">Noticia del colegio</span>
                  <span className="block text-sm font-medium">{item.title}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-card px-3 py-3 ring-1 ring-foreground/10 sm:px-4">
        <h3 className="px-2 font-display text-xl">Lo que viene</h3>
        {upcoming.length === 0 ? (
          <p className="px-2 py-2 text-sm text-muted-foreground">No tenés entregas pendientes por delante.</p>
        ) : (
          <div className="mt-1 flex flex-col">
            {upcoming.map((task) => (
              <TaskRow key={task.id} task={task} showDay today={today} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
