"use client";

import { useState } from "react";
import { Paperclip, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SchoolNews } from "@/lib/educamos";

export type NewsState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; news: SchoolNews[]; note?: string; sample?: boolean };

const URL_PATTERN = /(https:\/\/[^\s<>()]+[^\s<>().,;:!?])/g;

export function LinkedText({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-primary underline">
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

function NewsCard({ item }: { item: SchoolNews }) {
  const [open, setOpen] = useState(false);
  const long = item.text.length > 360;
  const shown = open || !long ? item.text : `${item.text.slice(0, 340).replace(/\s+\S*$/, "")}…`;
  const sample = item.id.startsWith("00000000-");
  return (
    <article className="news-card rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl leading-tight">{item.title}</h3>
        {item.urgent ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
            <TriangleAlert className="size-3.5" /> Importante
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Publicada el {newsDate(item.start)}</p>
      {shown ? (
        <div className="mt-3 flex flex-col gap-2 text-sm leading-relaxed">
          {shown.split("\n").map((line, index) => (
            <p key={index}>
              <LinkedText text={line} />
            </p>
          ))}
        </div>
      ) : null}
      {long ? (
        <button type="button" className="mt-1 text-sm font-semibold text-primary" onClick={() => setOpen((value) => !value)}>
          {open ? "Ver menos" : "Ver todo"}
        </button>
      ) : null}
      {item.images > 0 && !sample ? (
        <div className="mt-3 flex flex-col gap-2">
          {Array.from({ length: item.images }, (_, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={index}
              src={`/api/events/news/${item.id}/image/${index}`}
              alt={`Imagen de «${item.title}»`}
              loading="lazy"
              className="w-full rounded-xl ring-1 ring-foreground/10"
            />
          ))}
        </div>
      ) : null}
      {item.links.length > 0 || (item.hasAttachment && !sample) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.links.map((link) => (
            <Button key={link.url} asChild variant="outline" size="sm" className="max-w-full">
              <a href={link.url} target="_blank" rel="noopener noreferrer nofollow">
                <span className="truncate">{link.label}</span>
              </a>
            </Button>
          ))}
          {item.hasAttachment && !sample ? (
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/events/news/${item.id}/attachment`} target="_blank" rel="noopener">
                <Paperclip /> Ver adjunto
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function NewsBoard({ state, onRetry }: { state: NewsState; onRetry: () => void }) {
  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <p className="text-center text-sm text-muted-foreground">Leyendo el tablón de Educamos…</p>
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-28 animate-pulse rounded-2xl bg-card/70 ring-1 ring-foreground/10" />
        ))}
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-4 py-6 text-center ring-1 ring-foreground/10">
        <p className="text-sm text-destructive">{state.error}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw /> Probar de nuevo
        </Button>
      </div>
    );
  }
  if (state.news.length === 0) {
    return (
      <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm ring-1 ring-foreground/10">
        {state.note ?? "No hay noticias en el tablón de este ciclo lectivo."}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {state.sample ? <p className="text-center text-xs text-muted-foreground">Noticias de ejemplo de la cuenta de prueba.</p> : null}
      {state.news.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  );
}
