"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = { id: string; role: "user" | "assistant"; content: string };

const suggestions = [
  "¿Qué tareas tengo hoy?",
  "¿De qué materia es lo que vence primero?",
  "¿Cómo voy con la misión diaria?",
  "¿Cuántos puntos me faltan para una tirada?",
];

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
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = (await res.json()) as { error?: string; reply?: Message };
    setBusy(false);
    if (!res.ok || !data.reply) {
      setError(data.error ?? "No pude responder.");
      return;
    }
    setMessages((current) => [...current, data.reply as Message]);
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="flex flex-1 flex-col gap-3">
        {messages.length === 0 ? (
          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="font-display text-xl">Preguntame por tus tareas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Puedo decirte qué vence, de qué materia es y cómo organizar el día. No veo tu contraseña.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {suggestions.map((item) => (
                <Button key={item} variant="outline" className="h-auto justify-start py-2 text-left whitespace-normal" onClick={() => void send(item)}>
                  {item}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
                message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-card ring-1 ring-foreground/10"
              }`}
            >
              {message.content}
            </div>
          ))
        )}
        {busy ? <p className="text-sm text-muted-foreground">Estoy mirando tus tareas…</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <form
        className="sticky bottom-20 mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text);
        }}
      >
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Escribí tu duda"
          className="min-h-12"
          rows={2}
        />
        <Button className="h-12" type="submit" disabled={busy || !text.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
