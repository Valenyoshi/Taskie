"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function showNotice(title: string, body: string) {
  if (!("Notification" in window)) throw new Error("Este navegador no muestra avisos.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Sin permiso.");
  if (!("serviceWorker" in navigator)) {
    new Notification(title, { body, icon: "/icon-192.png" });
    return;
  }
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  try {
    const keyRes = await fetch("/api/push/public-key");
    const keyData = (await keyRes.json()) as { publicKey: string };
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      }));
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
    const sent = await fetch("/api/push/test", { method: "POST" });
    if (sent.ok) return;
  } catch {
    // Este navegador no tiene servicio push. El aviso sale igual desde la página.
  }
  await registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    data: { url: "/inicio" },
  });
}

export function NotifyCard({
  enabled,
  reminders,
}: {
  enabled: boolean;
  reminders: { id: string; subject: string; title: string; when: string; color: string }[];
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setBusy(true);
    setMessage(null);
    if (next) {
      try {
        await showNotice("task.ai", reminders[0] ? `${reminders[0].subject}: ${reminders[0].title}` : "Avisos activos.");
      } catch (error) {
        setBusy(false);
        setMessage(error instanceof Error ? error.message : "No pude activar los avisos.");
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
    try {
      const first = reminders[0];
      await showNotice(first ? first.subject : "task.ai", first ? `${first.when}. ${first.title}` : "Así llegan los avisos.");
      setOn(true);
      await fetch("/api/push/toggle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      setMessage("Enviado");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pude mostrar el aviso.");
    }
    setBusy(false);
  }

  return (
    <section className="rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
      <div className="flex items-center gap-2">
        <Bell className="size-5 shrink-0 text-coral" />
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          {reminders.length === 0 ? (
            <span className="text-sm text-muted-foreground">Al día</span>
          ) : (
            reminders.slice(0, 6).map((item) => (
              <span
                key={item.id}
                title={item.title}
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                style={{ background: item.color }}
              >
                {item.when} · {item.subject}
              </span>
            ))
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={busy}
          onClick={() => void toggle(!on)}
          className={`relative h-7 w-12 shrink-0 rounded-full ${on ? "bg-coral" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow ${on ? "left-5" : "left-0.5"}`} />
          <span className="sr-only">Avisos</span>
        </button>
        <button type="button" disabled={busy} onClick={() => void test()} className="shrink-0 text-xs font-semibold text-coral">
          Probar
        </button>
      </div>
      {message ? <p className="mt-1 text-xs text-muted-foreground">{message}</p> : null}
    </section>
  );
}
