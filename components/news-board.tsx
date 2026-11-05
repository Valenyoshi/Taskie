"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { SchoolNews } from "@/lib/educamos";

export type NewsState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; news: SchoolNews[]; note?: string; sample?: boolean };

const URL_PATTERN = /(https:\/\/[^\s<>()]+[^\s<>().,;:!?])/g;
const PAPERS = ["#fff4c2", "#fde4ea", "#e5f3ff", "#e7f6df"];
const PINS = ["#e23b3b", "#2f6fdb", "#e2b01a", "#3d9a4a"];

export function LinkedText({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer nofollow" className="break-all underline">
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

export function newsDate(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return day;
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

function tilt(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return ((hash % 5) - 2) * 0.8;
}

function MoreButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="board-more" aria-expanded={open} onClick={onToggle}>
      <ChevronDown className={`size-4 ${open ? "rotate-180" : ""}`} />
      {open ? "Leer menos" : "Leer más"}
    </button>
  );
}

function Note({ item, index }: { item: SchoolNews; index: number }) {
  const [open, setOpen] = useState(false);
  const sample = item.id.startsWith("00000000-");
  const preview = item.text.replace(/\s+/g, " ").trim();
  const more = preview.length > 140 || item.text.includes("\n") || item.images > 0 || item.links.length > 0 || (item.hasAttachment && !sample);
  return (
    <article className="board-note" style={{ background: PAPERS[index % PAPERS.length], ["--tilt" as string]: `${tilt(item.id)}deg` }}>
      <span className="board-pin" style={{ background: item.urgent ? "#e23b3b" : PINS[index % PINS.length] }} aria-hidden />
      <h3>{item.title}</h3>
      {item.urgent ? <p className="board-note-flag">Importante</p> : null}
      {open && more ? <MoreButton open={open} onToggle={() => setOpen((value) => !value)} /> : null}
      {!open && preview ? <p className="board-note-preview">{preview}</p> : null}
      {!open && !preview && item.images > 0 ? <p className="board-note-preview">Tiene una imagen.</p> : null}
      {!open && more ? <MoreButton open={open} onToggle={() => setOpen((value) => !value)} /> : null}
      {open && preview ? (
        <div className="board-note-body">
          {item.text.split("\n").map((line, lineIndex) => (
            <p key={lineIndex}>
              <LinkedText text={line} />
            </p>
          ))}
        </div>
      ) : null}
      {open && !sample
        ? item.links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="board-note-link">
              {link.label}
            </a>
          ))
        : null}
      {open && item.images > 0 && !sample
        ? Array.from({ length: item.images }, (_, image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={image} src={`/api/events/news/${item.id}/image/${image}`} alt="" className="board-note-img" />
          ))
        : null}
      {open && item.hasAttachment && !sample ? (
        <a href={`/api/events/news/${item.id}/attachment`} target="_blank" rel="noopener" className="board-note-link">
          Ver adjunto
        </a>
      ) : null}
      <p className="board-note-date">{newsDate(item.start)}</p>
    </article>
  );
}

export function NewsBoard({ state, onRetry }: { state: NewsState; onRetry: () => void }) {
  return (
    <section>
      <h2 className="board-title">Tablón de eventos</h2>
      <div className="board-frame">
        <div className="board-cork">
          {state.status === "loading" ? (
            <>
              <p className="board-status">Buscando las noticias del colegio…</p>
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="board-note board-note-ghost" style={{ ["--tilt" as string]: `${(key - 1.5) * 0.8}deg` }} />
              ))}
            </>
          ) : null}
          {state.status === "error" ? (
            <article className="board-note open" style={{ background: "#fff4c2" }}>
              <span className="board-pin" style={{ background: "#e23b3b" }} aria-hidden />
              <h3>No pude leer el tablón</h3>
              <p className="board-note-body">{state.error}</p>
              <button type="button" className="board-note-link" onClick={onRetry}>
                Probar de nuevo
              </button>
            </article>
          ) : null}
          {state.status === "ready" && state.news.length === 0 ? (
            <article className="board-note open" style={{ background: "#fff4c2" }}>
              <span className="board-pin" style={{ background: "#e2b01a" }} aria-hidden />
              <h3>Tablón vacío</h3>
              <p className="board-note-body">{state.note ?? "Este ciclo lectivo no tiene noticias."}</p>
            </article>
          ) : null}
          {state.status === "ready"
            ? state.news.map((item, index) => <Note key={item.id} item={item} index={index} />)
            : null}
        </div>
      </div>
      {state.status === "ready" && state.sample ? <p className="mt-2 text-center text-xs text-muted-foreground">Noticias de ejemplo.</p> : null}
    </section>
  );
}
