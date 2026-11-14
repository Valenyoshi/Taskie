"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseMind } from "@/lib/apunte-format";
import type { Apunte } from "@/lib/db";

const KIND: Record<Apunte["kind"], string> = {
  resumen: "Resumen",
  esquema: "Esquema",
  mapa: "Mapa mental",
};

function Outline({ body }: { body: string }) {
  const lines = body.split("\n").map((line) => line.trimEnd()).filter((line) => line.trim());
  return (
    <ul className="apunte-outline">
      {lines.map((line, index) => {
        const sub = /^\s+[-–•]/.test(line) || /^[-–]/.test(line.trim());
        const text = line.trim().replace(/^[•*-]\s+/, "").replace(/^[-–]\s+/, "");
        return (
          <li key={index} className={sub ? "sub" : ""}>
            {text}
          </li>
        );
      })}
    </ul>
  );
}

function Mind({ body, title }: { body: string; title: string }) {
  const map = parseMind(body, title);
  if (map.branches.length === 0) return <p className="whitespace-pre-wrap">{body}</p>;
  return (
    <div className="mind">
      <p className="mind-center">{map.center}</p>
      <ul className="mind-branches">
        {map.branches.map((branch) => (
          <li key={branch.label}>
            <strong>{branch.label}</strong>
            {branch.children.length > 0 ? (
              <ul>
                {branch.children.map((child) => (
                  <li key={child}>{child}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ApuntesPanel({ notes }: { notes: Apunte[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function remove(id: string) {
    setBusy(id);
    setError("");
    const res = await fetch(`/api/apuntes/${id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      setError("No pude borrar ese apunte.");
      return;
    }
    router.refresh();
  }

  if (notes.length === 0) {
    return (
      <div className="rounded-2xl bg-card px-4 py-8 text-center ring-1 ring-foreground/10">
        <p className="font-display text-2xl">Todavía no hay apuntes</p>
        <p className="mt-2 text-sm text-muted-foreground">
          En la IA pedile un resumen, un esquema o un mapa mental. Por ejemplo: «haceme un resumen de la célula».
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
      {notes.map((note) => (
        <article key={note.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {KIND[note.kind]}
                {note.subject ? ` · ${note.subject}` : ""}
              </p>
              <h2 className="font-display text-2xl leading-tight">{note.title}</h2>
            </div>
            <button
              type="button"
              className="text-sm font-semibold text-muted-foreground"
              disabled={busy === note.id}
              onClick={() => void remove(note.id)}
            >
              Borrar
            </button>
          </div>
          <div className="mt-3 text-sm leading-relaxed">
            {note.kind === "mapa" ? (
              <Mind body={note.body} title={note.title} />
            ) : note.kind === "esquema" ? (
              <Outline body={note.body} />
            ) : (
              <p className="whitespace-pre-wrap">{note.body}</p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
