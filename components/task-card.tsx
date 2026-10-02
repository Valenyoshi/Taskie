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
  const [fileName, setFileName] = useState(task.fileName);
  const [open, setOpen] = useState(false);
  const color = subjectColor(task.subject);

  async function complete() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tasks/${task.id}/complete`, { method: "POST" });
    const data = (await res.json()) as { error?: string; lines?: string[] };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo marcar.");
      return;
    }
    rememberGain(data.lines ?? []);
    router.refresh();
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
    <article className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10" style={{ boxShadow: `inset 6px 0 0 ${color}` }}>
      <div className="flex items-start gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span title={task.subject} className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: color }}>
              {shortSubject(task.subject)}
            </span>
            <span className={`text-xs font-semibold ${task.shortDue === "Atrasada" ? "text-rose-600" : "text-muted-foreground"}`}>
              {task.shortDue}
            </span>
          </div>
          <h3 className="mt-1 font-display text-lg leading-tight">{task.title}</h3>
        </div>
        {task.pending ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void complete()}
            className="shrink-0 rounded-full bg-orange-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "…" : "Listo"}
          </button>
        ) : (
          <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-800">
            {task.onTime ? "A tiempo" : "Tarde"}
          </span>
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
