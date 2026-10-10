"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { GeminiMark } from "@/components/gemini-mark";

type Message = { id: string; role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; createdAt: string; updatedAt: string };

const suggestions = ["¿Qué tengo hoy?", "Explicame cómo hacer una tarea"];

export function ChatBox({
  initial,
  conversations: initialConversations,
  activeConversationId: initialConversationId,
}: {
  initial: Message[];
  conversations: Conversation[];
  activeConversationId: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectConversation(conversationId: string) {
    if (busy || historyBusy || conversationId === activeConversationId) return;
    setHistoryBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat?conversationId=${encodeURIComponent(conversationId)}`);
      const data = (await res.json()) as { error?: string; messages?: Message[] };
      if (!res.ok || !data.messages) throw new Error(data.error ?? "No pude abrir el chat.");
      setActiveConversationId(conversationId);
      setMessages(data.messages);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pude abrir el chat.");
    } finally {
      setHistoryBusy(false);
    }
  }

  function startNewChat() {
    if (busy || historyBusy) return;
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
  }

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
    if (data.conversation) {
      setActiveConversationId(data.conversation.id);
      setConversations((current) => [
        data.conversation as Conversation,
        ...current.filter((item) => item.id !== data.conversation?.id),
      ]);
    }
    setMessages((current) => [...current, data.reply as Message]);
  }

  return (
    <div className="gemini-chat">
      <div className="gemini-thread">
        {historyBusy ? (
          <div className="gemini-empty">
            <GeminiMark size={44} />
            <p className="font-display text-2xl">Abriendo chat…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="gemini-empty">
            <GeminiMark size={56} />
            <p className="font-display text-3xl">Hola, ¿cómo puedo ayudarte?</p>
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
          placeholder="Escribí tu pregunta para empezar"
          aria-label="Mensaje"
        />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Enviar">
          <ArrowUp className="size-5" />
        </button>
      </form>
      <div className="chat-history">
        <div className="chat-history-head">
          <p>Historial de chats</p>
          <button type="button" onClick={startNewChat} disabled={busy || historyBusy}>
            + Nuevo chat
          </button>
        </div>
        {conversations.length > 0 ? (
          <div className="chat-history-list" aria-label="Chats guardados">
            {conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                className={conversation.id === activeConversationId ? "active" : ""}
                onClick={() => void selectConversation(conversation.id)}
                disabled={busy || historyBusy}
              >
                {conversation.title}
              </button>
            ))}
          </div>
        ) : (
          <p className="chat-history-empty">Tus chats nuevos aparecerán acá.</p>
        )}
      </div>
    </div>
  );
}
