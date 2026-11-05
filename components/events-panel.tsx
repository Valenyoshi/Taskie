"use client";

import { useCallback, useEffect, useState } from "react";
import { MailPanel } from "@/components/mail-panel";
import { NewsBoard, type NewsState } from "@/components/news-board";
import { TaskCalendar } from "@/components/task-calendar";
import type { SchoolNews } from "@/lib/educamos";
import type { CalendarTask } from "@/lib/view";

type Tab = "anuncios" | "calendario" | "correo";

const TABS: { id: Tab; label: string }[] = [
  { id: "anuncios", label: "Anuncios" },
  { id: "calendario", label: "Calendario" },
  { id: "correo", label: "Correo" },
];

export function EventsPanel({
  initialTab,
  tasks,
  today,
  isDemo,
}: {
  initialTab: Tab;
  tasks: CalendarTask[];
  today: string;
  isDemo: boolean;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [news, setNews] = useState<NewsState>({ status: "loading" });

  const loadNews = useCallback(async () => {
    setNews({ status: "loading" });
    const res = await fetch("/api/events/news").catch(() => null);
    const data = (await res?.json().catch(() => null)) as { news?: SchoolNews[]; note?: string; sample?: boolean; error?: string } | null;
    if (!res || !res.ok || !data || data.error) {
      setNews({ status: "error", error: data?.error ?? "No pude leer el tablón de Educamos." });
      return;
    }
    setNews({ status: "ready", news: data.news ?? [], note: data.note, sample: data.sample });
  }, []);

  useEffect(() => {
    void loadNews();
  }, [loadNews]);

  const choose = (next: Tab) => {
    setTab(next);
    window.history.replaceState(null, "", next === "anuncios" ? "/eventos" : `/eventos?tab=${next}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="ia-switch three" role="tablist" aria-label="Secciones de eventos">
        {TABS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "on" : ""} onClick={() => choose(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {tab === "anuncios" ? <NewsBoard state={news} onRetry={() => void loadNews()} /> : null}
      {tab === "calendario" ? (
        <TaskCalendar tasks={tasks} today={today} news={news.status === "ready" ? news.news : []} onOpenNews={() => choose("anuncios")} />
      ) : null}
      {tab === "correo" ? <MailPanel isDemo={isDemo} /> : null}
    </div>
  );
}
