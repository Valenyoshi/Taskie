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
  const [phase, setPhase] = useState<"idle" | "loading" | "strike" | "check" | "leave" | "settled">(
    task.pending ? "idle" : "settled",
  );
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
    window.setTimeout(() => setPhase("check"), 1100);
    window.setTimeout(() => setPhase("leave"), 1900);
    window.setTimeout(() => router.refresh(), 2450);
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
    <article
      className={`rise-in relative overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 ${phase === "leave" ? "task-leave" : ""}`}
      style={{ boxShadow: `inset 6px 0 0 ${color}` }}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span title={task.subject} className="text-[11px] font-bold" style={{ color }}>
              {shortSubject(task.subject)}
            </span>
            <span className="text-xs font-semibold" style={{ color: task.shortDue === "Atrasada" ? color : undefined }}>
              {task.shortDue}
            </span>
          </div>
          <h3 className="mt-1 font-display text-lg leading-tight" style={{ color }}>
            {task.title}
          </h3>
        </div>
        {phase === "loading" ? (
          <span className="spinner" aria-label="Cargando" />
        ) : phase === "idle" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void complete()}
            className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-white"
            style={{ background: color }}
          >
            Listo
          </button>
        ) : phase === "settled" ? (
          <span className="grid size-9 place-items-center text-2xl font-bold" style={{ color }} aria-label="Lista">
            ✓
          </span>
        ) : null}
      </div>
      <span
        className={`card-strike ${phase === "strike" || phase === "check" || phase === "leave" || phase === "settled" ? "on" : ""}`}
        style={{ color }}
      />
      {phase === "check" || phase === "leave" ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="big-check">✓</span>
        </div>
      ) : null}
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
