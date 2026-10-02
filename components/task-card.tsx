"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rememberGain } from "@/components/gain-banner";
import { shortSubject, subjectColor } from "@/lib/subject-color";
import type { TaskView } from "@/lib/view";

export function TaskCard({ task }: { task: TaskView }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading" | "strike" | "done">(task.pending ? "idle" : "done");
  const [fileName, setFileName] = useState(task.fileName);
  const [open, setOpen] = useState(false);
  const color = subjectColor(task.subject);

  async function complete() {
    setPhase("loading");
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tasks/${task.id}/complete`, { method: "POST" });
    const data = (await res.json()) as { error?: string; lines?: string[] };
    setBusy(false);
    if (!res.ok) {
      setPhase("idle");
      setError(data.error ?? "No se pudo marcar.");
      return;
    }
    setPhase("strike");
    rememberGain(data.lines ?? []);
    window.setTimeout(() => setPhase("done"), 380);
    window.setTimeout(() => router.refresh(), 1100);
  }

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    const res = await fetch(`/api/tasks/${task.id}/file`, { method: "POST", body });
    const data = (await res.json()) as { error?: string; fileName?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo subir.");
      return;
    }
    setFileName(data.fileName ?? file.name);
  }

  return (
    <article className="rise-in overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10" style={{ boxShadow: `inset 6px 0 0 ${color}` }}>
      <div className="flex items-start gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className={`flex items-center gap-2 ${phase === "strike" || phase === "done" ? "task-title is-done" : ""}`}>
            <span title={task.subject} className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: color }}>
              {shortSubject(task.subject)}
            </span>
            <span className={`text-xs font-semibold ${task.shortDue === "Atrasada" ? "text-coral" : "text-muted-foreground"}`}>
              {task.shortDue}
            </span>
          </div>
          <h3 className={`task-title mt-1 font-display text-lg leading-tight ${phase === "strike" || phase === "done" ? "is-done" : ""}`}>{task.title}</h3>
        </div>
        {phase === "loading" ? (
          <span className="spinner" aria-label="Cargando" />
        ) : phase === "done" ? (
          <span className="check-pop grid size-9 place-items-center rounded-full bg-pine text-lg text-white" aria-label="Lista">
            ✓
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void complete()}
            className="shrink-0 rounded-full bg-coral px-3 py-2 text-sm font-semibold text-white"
          >
            Listo
          </button>
        )}
      </div>
      <button type="button" className="w-full px-3 pb-2 text-left text-xs font-semibold text-muted-foreground" onClick={() => setOpen((value) => !value)}>
        {open ? "Ocultar" : "Entrega"}
      </button>
      {open ? (
        <div className="space-y-2 px-3 pb-3 text-sm">
          {task.description ? <p>{task.description}</p> : null}
          <p className="text-xs text-muted-foreground">{task.dueLabel}</p>
          {task.pending ? (
            <label className="inline-flex h-9 cursor-pointer items-center rounded-full bg-secondary px-3 text-sm font-medium">
              {fileName ?? "Archivo"}
              <input
                type="file"
                disabled={busy}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </label>
          ) : fileName ? (
            <a className="text-sm text-primary underline" href={`/api/tasks/${task.id}/file`}>
              {fileName}
            </a>
          ) : null}
          {task.educamosUrl ? (
            <a className="block text-sm font-semibold" style={{ color }} href={task.educamosUrl} target="_blank" rel="noreferrer">
              Educamos
            </a>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="px-3 pb-3 text-sm text-destructive">{error}</p> : null}
    </article>
  );
}
