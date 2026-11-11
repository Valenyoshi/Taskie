"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ReadingDialog } from "@/components/reading-window";
import { weekdayIndex } from "@/lib/time";
import type { CalendarTask } from "@/lib/view";
import { cn } from "cn";

const WEEKDAYS = ["L", "M", "Mi", "J", "V", "S", "D"];

const WEEKDAY_LOGOS = [
  { name: "Lunes", short: "Lu", color: "#e8a317" },
  { name: "Martes", short: "Ma", color: "#e25b45" },
  { name: "Miércoles", short: "Mi", color: "#2f7d1f" },
  { name: "Jueves", short: "Ju", color: "#2f6fdb" },
  { name: "Viernes", short: "Vi", color: "#7c3aed" },
  { name: "Sábado", short: "Sá", color: "#db3e8a" },
  { name: "Domingo", short: "Do", color: "#0e7490" },
];

function WeekdayLogo({ day }: { day: string }) {
  const logo = WEEKDAY_LOGOS[weekdayIndex(day)];
  return (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-full font-display text-sm leading-none text-white"
      style={{ background: logo.color }}
      title={logo.name}
      aria-hidden
    >
      {logo.short}
    </span>
  );
}

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

function dateOnly(day: string): string {
  const [y, m, d] = parts(day);
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

function dayTitle(day: string, today: string): string {
  const logo = WEEKDAY_LOGOS[weekdayIndex(day)];
  const date = dateOnly(day);
  return day === today ? `Hoy, ${logo.name} ${date}` : `${logo.name}, ${date}`;
}

function dayName(day: string): string {
  const [y, m, d] = parts(day);
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

function hour(task: CalendarTask): string {
  return task.time && task.time !== "23:59" ? ` · ${task.time}` : "";
}

function DayTasks({ day, today, tasks }: { day: string; today: string; tasks: CalendarTask[] }) {
  const pending = tasks.filter((task) => task.status === "pending");
  const done = tasks.filter((task) => task.status === "done");
  return (
    <>
      <h3 id={`day-${day}`} className="flex items-center gap-2 font-display text-2xl leading-none" aria-label={dayTitle(day, today)}>
        <WeekdayLogo day={day} />
        <span>{day === today ? "Hoy" : dateOnly(day)}</span>
      </h3>
      <ul className="mt-3 flex flex-col gap-2">
        {pending.map((task) => (
          <li key={task.id}>
            <TaskLine task={task} />
          </li>
        ))}
        {done.map((task) => (
          <li key={task.id}>
            <TaskLine task={task} />
          </li>
        ))}
      </ul>
    </>
  );
}

function TaskLine({ task }: { task: CalendarTask }) {
  const router = useRouter();
  const [readingOpen, setReadingOpen] = useState(false);
  const text = (
    <>
      <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: task.color }} aria-hidden />
      <span className={cn("min-w-0 text-sm", task.status === "done" && "text-muted-foreground line-through")}>
        <b className="font-semibold">{task.subjectLabel}.</b> {task.reading ? "Lectura. " : ""}
        {task.title}
        {task.status === "pending" ? hour(task) : ""}
        {task.late ? <span className="font-semibold text-destructive"> · atrasada</span> : null}
      </span>
    </>
  );
  const className = "flex items-start gap-2 rounded-lg";
  if (task.reading && task.url && task.status === "pending") {
    return (
      <div>
        <button type="button" className={cn(className, "w-full text-left hover:underline")} onClick={() => setReadingOpen(true)}>
          {text}
        </button>
        <ReadingDialog
          open={readingOpen}
          url={task.url}
          title={task.title}
          taskId={task.id}
          onClose={() => setReadingOpen(false)}
          onReady={() => {
            setReadingOpen(false);
            router.refresh();
          }}
        />
      </div>
    );
  }
  return task.url && task.status === "pending" ? (
    <a href={task.url} target="_blank" rel="noopener noreferrer" className={cn(className, "hover:underline")}>
      {text}
    </a>
  ) : (
    <div className={className}>{text}</div>
  );
}

export function TaskCalendar({ tasks, today }: { tasks: CalendarTask[]; today: string }) {
  const [ty, tm] = parts(today);
  const [month, setMonth] = useState<[number, number]>([ty, tm]);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [hover, setHover] = useState<{ day: string; top: number; left: number; above: boolean } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    setOpenDay(null);
    setHover(null);
  };

  const next = tasks.find((task) => task.status === "pending" && task.day >= today);
  const openTasks = openDay ? (byDay.get(openDay) ?? []) : [];
  const hoverTasks = hover ? (byDay.get(hover.day) ?? []) : [];

  const cancelHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };
  const scheduleHide = () => {
    cancelHide();
    hideTimer.current = setTimeout(() => setHover(null), 140);
  };
  const showHover = (day: string, target: HTMLElement) => {
    if (openDay) return;
    cancelHide();
    const rect = target.getBoundingClientRect();
    const width = 250;
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12);
    const above = rect.bottom + 170 > window.innerHeight;
    setHover({ day, top: above ? rect.top - 8 : rect.bottom + 8, left, above });
  };

  useEffect(() => {
    if (!openDay) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDay(null);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [openDay]);

  useEffect(() => () => cancelHide(), []);

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
          const list = byDay.get(day) ?? [];
          const pending = list.filter((task) => task.status === "pending");
          const late = pending.some((task) => task.late);
          const busy = pending.length > 0;
          return (
            <button
              key={day}
              type="button"
              onClick={() => {
                if (!busy) return;
                setHover(null);
                setOpenDay(day);
              }}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse" && busy) showHover(day, event.currentTarget);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") scheduleHide();
              }}
              onFocus={(event) => {
                if (busy && window.matchMedia("(hover: hover)").matches) showHover(day, event.currentTarget);
              }}
              onBlur={() => scheduleHide()}
              aria-pressed={openDay === day}
              aria-haspopup={busy ? "dialog" : undefined}
              aria-label={`${dayName(day)}: ${busy ? `${pending.length} ${pending.length === 1 ? "entrega" : "entregas"}` : "sin entregas"}`}
              className={cn(
                "calendar-day flex h-11 flex-col items-center justify-center rounded-lg text-sm sm:h-12",
                !busy && "cursor-default",
                openDay === day && "bg-primary text-primary-foreground",
                day === today && openDay !== day && "font-bold underline decoration-2 underline-offset-4",
              )}
            >
              <span className={cn("leading-none", late && openDay !== day && "text-destructive")}>{Number(day.slice(8))}</span>
              <span className="mt-1 flex h-1.5 items-center gap-0.5">
                {pending.slice(0, 3).map((task) => (
                  <span key={task.id} className="size-1.5 rounded-full" style={{ background: openDay === day ? "currentColor" : task.color }} />
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
            setOpenDay(null);
          }}
        >
          Volver a hoy
        </button>
      ) : null}

      {hover && hoverTasks.length > 0
        ? createPortal(
            <div
              className="fixed z-40 w-[250px] rounded-2xl bg-card p-3 shadow-xl ring-1 ring-foreground/10"
              style={{ top: hover.top, left: hover.left, transform: hover.above ? "translateY(-100%)" : undefined }}
              onMouseEnter={cancelHide}
              onMouseLeave={scheduleHide}
            >
              <DayTasks day={hover.day} today={today} tasks={hoverTasks} />
            </div>,
            document.body,
          )
        : null}

      {openDay
        ? createPortal(
            <div className="fixed inset-0 z-[80] grid place-items-center bg-foreground/40 p-5" onClick={() => setOpenDay(null)}>
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`day-${openDay}`}
                className="w-full max-w-sm rounded-2xl bg-card p-4 shadow-2xl ring-1 ring-foreground/10"
                onClick={(event) => event.stopPropagation()}
              >
                <button type="button" className="float-right grid size-8 place-items-center rounded-full hover:bg-muted" onClick={() => setOpenDay(null)} aria-label="Cerrar" autoFocus>
                  <X className="size-4" />
                </button>
                <DayTasks day={openDay} today={today} tasks={openTasks} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
