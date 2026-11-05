"use client";

import { useCallback, useEffect, useState } from "react";
import { MailPanel } from "@/components/mail-panel";
import { NewsBoard, type NewsState } from "@/components/news-board";
import { TaskCalendar } from "@/components/task-calendar";
import type { SchoolNews } from "@/lib/educamos";
import type { CalendarTask } from "@/lib/view";

export function EventsPanel({
  tasks,
  today,
  isDemo,
}: {
  tasks: CalendarTask[];
  today: string;
  isDemo: boolean;
}) {
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

  return (
    <div className="flex flex-col gap-5">
      <TaskCalendar tasks={tasks} today={today} />
      <NewsBoard state={news} onRetry={() => void loadNews()} />
      <section id="correo">
        <h2 className="board-title">Correo</h2>
        <MailPanel isDemo={isDemo} />
      </section>
    </div>
  );
}
