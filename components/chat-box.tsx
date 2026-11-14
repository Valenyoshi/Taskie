"use client";

import Link from "next/link";
import { useState } from "react";
import { KittyMark } from "@/components/kitty-mark";
import { plainChatText } from "@/lib/plain-text";

type Message = { id: string; role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; createdAt: string; updatedAt: string };

const suggestions = ["¿Qué tengo hoy?", "Haceme un resumen de un tema", "Armame un mapa mental"];

export function ChatBox({
  initial,
  activeConversationId: initialConversationId,
}: {
  initial: Message[];
  activeConversationId: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(value: string) {
    const message = value.trim();
    if (!message || busy) return;
    setText("");
    setError(null);
    setBusy(true);
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: "user", content: message }]);
    let res: Response;
    let data: { error?: string; reply?: Message; conversation?: Conversation };
    try {
      res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, conversationId: activeConversationId }),
      });
      data = (await res.json()) as {
        error?: string;
        reply?: Message;
        conversation?: Conversation;
      };
    } catch {
      setBusy(false);
      setError("No pude responder.");
      return;
    }
    setBusy(false);
    if (!res.ok || !data.reply) {
      setError(data.error ?? "No pude responder.");
      return;
    }
    if (data.conversation) setActiveConversationId(data.conversation.id);
    setMessages((current) => [...current, data.reply as Message]);
  }

  return (
    <div className="chat-panel">
      <div className="chat-thread">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <KittyMark size={56} />
            <p className="font-display text-3xl">¿Qué querés saber de tus tareas?</p>
            <div className="chat-suggestions">
              {suggestions.map((item) => (
                <button key={item} type="button" onClick={() => void send(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) =>
            message.role === "user" ? (
              <p key={message.id} className="chat-user">
                {message.content}
              </p>
            ) : (
              <div key={message.id} className="chat-reply">
                <KittyMark size={22} />
                <p>{plainChatText(message.content)}</p>
              </div>
            ),
          )
        )}
        {busy ? (
          <div className="chat-reply">
            <KittyMark size={22} />
            <p className="text-muted-foreground">Estoy mirando…</p>
          </div>
        ) : null}
        {error ? <p className="text-sm font-semibold text-coral">{error}</p> : null}
      </div>
      <form
        className="chat-compose"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text);
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Escribí tu pregunta para empezar"
          aria-label="Mensaje"
        />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Enviar">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </form>
      <Link href="/inicio" className="chat-back">
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
        Volver a Inicio
      </Link>
    </div>
  );
}
