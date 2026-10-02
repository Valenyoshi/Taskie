"use client";

import { useState } from "react";
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

export function NotifyToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !on;
    setBusy(true);
    setMessage(null);
    if (next) {
      try {
        await showNotice("task.ai", "Avisos activos.");
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
  }

  return (
    <div className="fixed right-3 bottom-20 z-30">
      <button
        type="button"
        aria-pressed={on}
        disabled={busy}
        onClick={() => void toggle()}
        className={`grid size-12 place-items-center rounded-full shadow ring-1 ring-foreground/10 ${on ? "bg-coral text-white" : "bg-card text-muted-foreground"}`}
      >
        <Bell className="size-5" />
        <span className="sr-only">{on ? "Apagar avisos" : "Prender avisos"}</span>
      </button>
      {message ? <p className="mt-1 max-w-40 text-right text-xs font-semibold text-coral">{message}</p> : null}
    </div>
  );
}
