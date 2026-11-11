"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ReadingDialogProps = {
  open: boolean;
  url: string;
  title: string;
  taskId: string;
  onClose: () => void;
  onReady: () => void;
};

const MIN_SECONDS = 8;

export function ReadingDialog({ open, title, taskId, onClose, onReady }: ReadingDialogProps) {
  const readyRef = useRef(onReady);
  const closeRef = useRef(onClose);
  const [text, setText] = useState("");
  const [textError, setTextError] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const started = useRef(0);
  const cancel = useRef(false);
  readyRef.current = onReady;
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setText("");
    setTextError("");
    setMicError("");
    cancel.current = false;
    void fetch(`/api/tasks/${taskId}/reading`)
      .then((res) => res.json())
      .then((data: { text?: string; error?: string }) => {
        if (!alive) return;
        if (data.error) setTextError(data.error);
        else setText(data.text ?? "");
      })
      .catch(() => {
        if (alive) setTextError("No pude traer el texto de la lectura.");
      });
    return () => {
      alive = false;
    };
  }, [open, taskId]);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    const look = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/tasks/${taskId}/reading`, { method: "POST" });
        const data = (await res.json()) as { ready?: boolean };
        if (!data.ready || stopped) return;
        stopped = true;
        readyRef.current();
      } catch {
        // Teams puede tardar. El próximo intento vuelve a mirar.
      }
    };
    const timer = window.setInterval(() => void look(), 5000);
    const stopLater = window.setTimeout(() => {
      stopped = true;
      window.clearInterval(timer);
    }, 20 * 60 * 1000);
    void look();
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.clearTimeout(stopLater);
    };
  }, [open, taskId]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started.current) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) return;
    cancel.current = true;
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
  }, [open]);

  async function finish() {
    const res = await fetch(`/api/tasks/${taskId}/reading`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ finished: true }),
    });
    const data = (await res.json()) as { ready?: boolean };
    if (data.ready) readyRef.current();
  }

  async function toggleRecording() {
    if (recorder.current && recording) {
      recorder.current.stop();
      return;
    }
    setMicError("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError("Permití el micrófono para grabar la lectura.");
      return;
    }
    const media = new MediaRecorder(stream);
    recorder.current = media;
    started.current = Date.now();
    setSeconds(0);
    setRecording(true);
    media.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      recorder.current = null;
      setRecording(false);
      if (cancel.current) return;
      const elapsed = (Date.now() - started.current) / 1000;
      if (elapsed >= MIN_SECONDS) void finish();
      else setMicError("Leé un poco más y volvé a grabar.");
    };
    media.start();
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-foreground/45 p-0 sm:items-center sm:p-5" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-[100dvh] w-full flex-col bg-card sm:h-[min(760px,94dvh)] sm:max-w-2xl sm:rounded-2xl sm:ring-1 sm:ring-foreground/15"
      >
        <div className="flex items-start gap-3 border-b border-foreground/10 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Hacer la lectura</p>
            <h2 className="truncate font-display text-xl leading-tight">{title}</h2>
          </div>
          <button type="button" className="rounded-full px-3 py-1.5 text-sm font-semibold" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {textError ? <p className="text-sm text-destructive">{textError}</p> : null}
          {text ? <p className="whitespace-pre-wrap text-base leading-relaxed">{text}</p> : null}
          {!text && !textError ? <p className="text-sm text-muted-foreground">Trayendo la lectura…</p> : null}
        </div>
        <div className="border-t border-foreground/10 px-4 py-3">
          {micError ? <p className="mb-2 text-center text-sm text-destructive">{micError}</p> : null}
          <button type="button" className="lesson-next w-full" onClick={() => void toggleRecording()}>
            {recording ? `Parar · ${seconds}s` : "Grabarme leyendo"}
          </button>
          <p className="mt-2 text-center text-xs font-semibold text-muted-foreground">
            Cuando termines de leer, se marca sola.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
