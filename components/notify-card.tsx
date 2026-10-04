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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function showNotice(title: string, body: string) {
  if (!("Notification" in window)) throw new Error("Este navegador no muestra avisos.");
  const permission = await withTimeout(Notification.requestPermission(), 4000);
  if (permission !== "granted") throw new Error("Sin permiso del navegador.");
  if (!("serviceWorker" in navigator)) {
    new Notification(title, { body, icon: "/icon-192.png" });
    return;
  }
  const registration = await withTimeout(
    navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready),
    3000,
  );
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

  async function toggle() {
    const next = !on;
    setOn(next);
    setMessage(null);
    const res = await fetch("/api/push/toggle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    if (!res.ok) {
      setOn(!next);
      setMessage("No se pudo guardar.");
      return;
    }
    if (!next) return;
    try {
      await showNotice("Taskie", "Avisos activos.");
    } catch (error) {
      setMessage(error instanceof Error && error.message !== "timeout" ? error.message : "No pude mostrar el aviso.");
    }
  }

  return (
    <div className="fixed right-3 bottom-20 z-30 flex flex-col items-end">
      <button
        type="button"
        aria-pressed={on}
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
