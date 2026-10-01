"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { rememberGain } from "@/components/gain-banner";
import type { TaskView } from "@/lib/view";

export function TaskCard({ task }: { task: TaskView }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState(task.fileName);

  async function complete() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tasks/${task.id}/complete`, { method: "POST" });
    const data = (await res.json()) as { error?: string; lines?: string[] };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo marcar la entrega.");
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
      setError(data.error ?? "No se pudo subir el archivo.");
      return;
    }
    setFileName(data.fileName ?? file.name);
  }

  return (
    <article className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="secondary">{task.subject}</Badge>
          <h3 className="mt-2 font-display text-lg leading-tight">{task.title}</h3>
        </div>
        {task.status === "done" ? (
          <Badge variant={task.onTime ? "default" : "outline"}>{task.onTime ? "A tiempo" : "Tarde"}</Badge>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{task.dueLabel}</p>
      <p className="mt-2 text-sm">{task.description}</p>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Espacio de entrega</p>
      <p className="text-sm">{task.needsFile ? "El docente pidió un archivo." : "Podés adjuntar un archivo si lo tenés."}</p>
      {fileName ? (
        <a className="mt-1 inline-block text-sm text-primary underline" href={`/api/tasks/${task.id}/file`}>
          {fileName}
        </a>
      ) : null}
      {task.pending ? (
        <div className="mt-3 flex flex-col gap-2">
          <label className="text-sm">
            <span className="mb-1 block">Subir archivo</span>
            <input
              type="file"
              disabled={busy}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
          </label>
          <Button className="h-11" disabled={busy} onClick={() => void complete()}>
            {busy ? "Guardando…" : "Marcar como entregada"}
          </Button>
        </div>
      ) : null}
      {task.educamosUrl ? (
        <a className="mt-3 inline-block text-sm text-primary underline" href={task.educamosUrl} target="_blank" rel="noreferrer">
          Abrir en Educamos
        </a>
      ) : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </article>
  );
}
