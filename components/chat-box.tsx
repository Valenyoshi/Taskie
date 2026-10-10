"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { GeminiMark } from "@/components/gemini-mark";

type Message = { id: string; role: "user" | "assistant"; content: string };

const suggestions = ["¿Qué tengo hoy?", "Explicame cómo hacer una tarea"];

export function ChatBox({ initial }: { initial: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initial);
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
    let data: { error?: string; reply?: Message };
    try {
      res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      data = (await res.json()) as { error?: string; reply?: Message };
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
    setMessages((current) => [...current, data.reply as Message]);
  }

  return (
    <div className="gemini-chat">
      <div className="gemini-thread">
        {messages.length === 0 ? (
          <div className="gemini-empty">
            <GeminiMark size={56} />
            <p className="font-display text-3xl">¡Hola! ¿En qué puedo ayudarte?</p>
            <div className="gemini-chips">
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
              <p key={message.id} className="gemini-user">
                {message.content}
              </p>
            ) : (
              <div key={message.id} className="gemini-reply">
                <GeminiMark size={22} />
                <p>{message.content}</p>
              </div>
            ),
          )
        )}
        {busy ? (
          <div className="gemini-reply">
            <GeminiMark size={22} />
            <p className="text-muted-foreground">Estoy mirando…</p>
          </div>
        ) : null}
        {error ? <p className="text-sm font-semibold text-coral">{error}</p> : null}
      </div>
      <form
        className="gemini-compose"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text);
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Preguntale a IA"
          aria-label="Mensaje"
        />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Enviar">
          <ArrowUp className="size-5" />
        </button>
      </form>
    </div>
  );
}
