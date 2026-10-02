"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { shortSubject, subjectColor } from "@/lib/subject-color";
import type { TaskView } from "@/lib/view";

function titleLineTop(title: HTMLElement, card: HTMLElement): number {
  const cardTop = card.getBoundingClientRect().top;
  const node = title.firstChild;
  if (node && node.nodeType === Node.TEXT_NODE && node.textContent) {
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 1);
    const rect = range.getBoundingClientRect();
    if (rect.height > 0) return rect.top + rect.height / 2 - cardTop;
  }
  const box = title.getBoundingClientRect();
  const lineHeight = Number.parseFloat(getComputedStyle(title).lineHeight);
  const through = Number.isFinite(lineHeight) ? lineHeight / 2 : box.height / 2;
  return box.top - cardTop + through;
}

export function TaskCard({ task }: { task: TaskView }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading" | "strike" | "check" | "leave" | "gone" | "settled">(
    task.pending ? "idle" : "settled",
  );
  const [fileName, setFileName] = useState(task.fileName);
  const [open, setOpen] = useState(task.kind === "archivo");
  const [refused, setRefused] = useState(false);
  const needsUpload = task.kind === "archivo" || task.needsFile;
  const [lineTop, setLineTop] = useState(36);
  const cardRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const color = subjectColor(task.subject);
  const struck = phase === "strike" || phase === "check" || phase === "leave" || phase === "settled";

  useLayoutEffect(() => {
    const card = cardRef.current;
    const title = titleRef.current;
    if (!card || !title) return;
    title.style.whiteSpace = "nowrap";
    let size = 18;
    title.style.fontSize = `${size}px`;
    while (title.scrollWidth > title.clientWidth + 1 && size > 12) {
      size -= 0.5;
      title.style.fontSize = `${size}px`;
    }
    const next = titleLineTop(title, card);
    setLineTop((current) => (Math.abs(current - next) < 0.5 ? current : next));
  }, [phase, open, task.title]);

  useEffect(() => {
    if (phase !== "strike") return;
    const toCheck = window.setTimeout(() => setPhase("check"), 980);
    return () => window.clearTimeout(toCheck);
  }, [phase]);

  useEffect(() => {
    if (phase !== "check") return;
    const toLeave = window.setTimeout(() => setPhase("leave"), 700);
    return () => window.clearTimeout(toLeave);
  }, [phase]);

  useEffect(() => {
    if (phase !== "leave") return;
    const toHide = window.setTimeout(() => {
      setPhase("gone");
      router.refresh();
    }, 420);
    return () => window.clearTimeout(toHide);
  }, [phase, router]);

  function refuse() {
    setRefused(true);
    cardRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-7px)" },
        { transform: "translateX(7px)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 450, easing: "ease" },
    );
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate([40, 30, 50]);
    window.setTimeout(() => setRefused(false), 650);
  }

  async function complete() {
    if (needsUpload && !fileName) {
      refuse();
      return;
    }
    setPhase("loading");
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tasks/${task.id}/complete`, { method: "POST" });
    const data = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setPhase("idle");
      if (needsUpload && !fileName) refuse();
      else setError(data.error ?? "No se pudo marcar.");
      return;
    }
    setPhase("strike");
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

  if (phase === "gone") return null;

  return (
    <article
      ref={cardRef}
      className={`rise-in relative overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 ${phase === "leave" ? "task-leave" : ""} ${refused ? "task-refuse" : ""}`}
      style={{ boxShadow: `inset 6px 0 0 ${color}`, background: refused ? "#f6cfc8" : undefined }}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span title={task.subject} className="text-[11px] font-bold" style={{ color }}>
              {shortSubject(task.subject)}
            </span>
            {task.kind === "archivo" ? (
              <span className="rounded-full bg-pine/15 px-2 py-0.5 text-[10px] font-bold uppercase text-pine">Archivo</span>
            ) : null}
            <span className="text-xs font-semibold" style={{ color: task.shortDue === "Atrasada" ? color : undefined }}>
              {task.shortDue}
            </span>
          </div>
          <h3 ref={titleRef} className="mt-1 font-display text-lg leading-tight" style={{ color }}>
            {task.title}
          </h3>
        </div>
        {phase === "loading" ? (
          <span className="spinner" aria-label="Cargando" />
        ) : phase === "idle" ? (
          <span className="flex shrink-0 items-center gap-1">
            {task.kind !== "archivo" ? (
              <button
                type="button"
                aria-expanded={open}
                aria-label={open ? "Ocultar información" : "Ver más información"}
                onClick={() => setOpen((value) => !value)}
                className="grid size-8 place-items-center text-muted-foreground"
              >
                <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Marcar como hecha"
              disabled={busy}
              onClick={() => void complete()}
              className="done-ring"
              style={{ color }}
            />
          </span>
        ) : phase === "settled" ? (
          <span className="grid size-9 place-items-center text-2xl font-bold" style={{ color }} aria-label="Lista">
            ✓
          </span>
        ) : null}
      </div>
      <span className={`card-line ${struck ? "on" : ""}`} style={{ top: lineTop, color }} />
      {phase === "check" || phase === "leave" ? (
        <div className="card-cover" aria-hidden>
          <span className="card-cover-mark">✓</span>
        </div>
      ) : null}
      {open || task.kind === "archivo" ? (
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
              {task.kind === "archivo" ? "Aula" : "Educamos"}
            </a>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="px-3 pb-3 text-sm text-destructive">{error}</p> : null}
    </article>
  );
}
