"use client";

import { useState } from "react";
import { HandChevronDown } from "@/components/hand-drawn-icons";
import { SubjectMark } from "@/components/subject-mark";
import { TaskCard } from "@/components/task-card";
import { subjectColor } from "@/lib/subject-color";
import type { TaskView } from "@/lib/view";

type SubjectRow = {
  subject: string;
  total: number;
  done: number;
  pending: number;
  tasks: TaskView[];
};

export function SubjectList({ subjects }: { subjects: SubjectRow[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (subjects.length === 0) {
    return <p className="rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">Cuando haya tareas, las vas a ver agrupadas acá.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {subjects.map((subject) => {
        const expanded = open === subject.subject;
        const color = subjectColor(subject.subject);
        const pending = subject.tasks.filter((task) => task.pending);
        const done = subject.tasks.filter((task) => !task.pending);
        return (
          <section
            key={subject.subject}
            className="rounded-2xl bg-card ring-1 ring-foreground/10"
            style={{ boxShadow: `inset 6px 0 0 ${color}` }}
          >
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? `Ocultar tareas de ${subject.subject}` : `Ver tareas de ${subject.subject}`}
              onClick={() => setOpen(expanded ? null : subject.subject)}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex min-w-0 items-center gap-2 font-display text-2xl">
                    <SubjectMark subject={subject.subject} size={36} />
                    <span className="truncate">{subject.subject}</span>
                  </h2>
                  <span className="shrink-0 text-sm text-muted-foreground">{subject.pending} por hacer</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${subject.total ? Math.round((subject.done / subject.total) * 100) : 0}%` }}
                  />
                </div>
                <p className="mt-2 text-sm">
                  {subject.done} de {subject.total} entregadas
                </p>
              </div>
              <HandChevronDown className={`size-5 shrink-0 text-muted-foreground transition ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded ? (
              <div className="task-stack space-y-3 px-3 pb-4">
                {pending.length === 0 && done.length === 0 ? (
                  <p className="rounded-xl bg-background px-3 py-4 text-center text-sm ring-1 ring-foreground/10">No hay tareas de esta materia.</p>
                ) : null}
                {pending.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {done.length > 0 ? (
                  <details className="rounded-2xl bg-background px-4 py-3 ring-1 ring-foreground/10">
                    <summary className="cursor-pointer font-medium">Hechas · {done.length}</summary>
                    <div className="mt-3 flex flex-col gap-3">
                      {done.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
