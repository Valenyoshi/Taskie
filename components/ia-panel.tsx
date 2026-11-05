"use client";

import { useState } from "react";
import { ChatBox } from "@/components/chat-box";
import { PaperQuiz } from "@/components/paper-quiz";

type Message = { id: string; role: "user" | "assistant"; content: string };

export function IaPanel({
  initial,
  activeConversationId,
}: {
  initial: Message[];
  activeConversationId: string | null;
}) {
  const [mode, setMode] = useState<"chat" | "quiz">("chat");

  return (
    <div className="flex flex-col gap-3">
      <div className="ia-switch" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "chat"} className={mode === "chat" ? "on" : ""} onClick={() => setMode("chat")}>
          Chat
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "quiz"}
          className={mode === "quiz" ? "on" : ""}
          onClick={() => setMode("quiz")}
        >
          Paper Quiz
        </button>
      </div>
      {mode === "chat" ? (
        <ChatBox initial={initial} activeConversationId={activeConversationId} />
      ) : (
        <PaperQuiz />
      )}
    </div>
  );
}
