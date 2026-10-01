"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function subscribe(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return { ok: false, error: "Este navegador no muestra avisos." };
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "No diste permiso para los avisos." };
  const registration = await navigator.serviceWorker.register("/sw.js");
  const keyRes = await fetch("/api/push/public-key");
  const keyData = (await keyRes.json()) as { publicKey: string };
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
    }));
  const json = subscription.toJSON();
  const saved = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(json),
  });
  if (!saved.ok) return { ok: false, error: "No pude guardar el aviso en este dispositivo." };
  return { ok: true };
}

export function NotifyCard({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setBusy(true);
    setMessage(null);
    if (next) {
      const result = await subscribe();
      if (!result.ok) {
        setBusy(false);
        setMessage(result.error);
        return;
      }
    }
    await fetch("/api/push/toggle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    setOn(next);
    setBusy(false);
    router.refresh();
  }

  async function test() {
    setBusy(true);
    setMessage(null);
    const ready = await subscribe();
    if (!ready.ok) {
      setBusy(false);
      setMessage(ready.error);
      return;
    }
    const res = await fetch("/api/push/test", { method: "POST" });
    const data = (await res.json()) as { error?: string };
    setBusy(false);
    setOn(true);
    setMessage(res.ok ? "Mandé un aviso de prueba a este dispositivo." : data.error ?? "No salió el aviso.");
  }

  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Recordatorios</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Un resumen si hoy te quedan tareas, y otro aviso si alguna vence en las próximas horas. En el iPhone llegan
            cuando agregás el sitio a la pantalla de inicio.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={busy}
          onClick={() => void toggle(!on)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-primary" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 size-6 rounded-full bg-card shadow ${on ? "left-5" : "left-0.5"}`} />
          <span className="sr-only">{on ? "Silenciar avisos" : "Activar avisos"}</span>
        </button>
      </div>
      <Button className="mt-3 h-10" variant="outline" disabled={busy} onClick={() => void test()}>
        Probar aviso
      </Button>
      {message ? <p className="mt-2 text-sm">{message}</p> : null}
    </section>
  );
}
