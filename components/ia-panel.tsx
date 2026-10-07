"use client";

import { useState } from "react";
import { ChatBox } from "@/components/chat-box";
import { LessonDeck } from "@/components/lesson-deck";

type Message = { id: string; role: "user" | "assistant"; content: string };

export function IaPanel({ initial, subjects }: { initial: Message[]; subjects: string[] }) {
  const [mode, setMode] = useState<"chat" | "lecciones">("chat");

  return (
    <div className="flex flex-col gap-3">
      <div className="ia-switch" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "chat"} className={mode === "chat" ? "on" : ""} onClick={() => setMode("chat")}>
          Chat
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "lecciones"}
          className={mode === "lecciones" ? "on" : ""}
          onClick={() => setMode("lecciones")}
        >
          Lecciones
        </button>
      </div>
      {mode === "chat" ? <ChatBox initial={initial} /> : <LessonDeck subjects={subjects} />}
    </div>
  );
}
