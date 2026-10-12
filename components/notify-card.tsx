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

function askPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return Promise.reject(new Error("Este navegador no muestra avisos."));
  if (Notification.permission === "granted") return Promise.resolve("granted");
  if (Notification.permission === "denied") return Promise.resolve("denied");
  return Notification.requestPermission();
}

async function showNotice(title: string, body: string): Promise<"push" | "local"> {
  if (!("serviceWorker" in navigator)) {
    new Notification(title, { body, icon: "/icon-192.png" });
    return "local";
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
    const result = (await sent.json().catch(() => null)) as { push?: boolean } | null;
    if (result?.push) return "push" as const;
  } catch {
    // Este navegador no tiene servicio push. El aviso sale igual desde la página.
  }
  await registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    data: { url: "/inicio" },
  });
  return "local" as const;
}

export function NotifyToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [message, setMessage] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  async function toggle(next: boolean, permissionAsk: Promise<NotificationPermission> | null) {
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
    if (!next || !permissionAsk) return;
    try {
      const permission = await permissionAsk;
      if (permission === "denied") {
        setMessage("El navegador bloqueó las notificaciones. Hacé clic en el icono de permisos de la barra para permitirlas.");
        return;
      }
      if (permission !== "granted") {
        setMessage("Se necesita permiso del navegador para recibir notificaciones.");
        return;
      }
      await showNotice("Taskie", "Notificaciones activadas.");
    } catch (error) {
      setMessage(error instanceof Error && error.message !== "timeout" ? error.message : "No se pudo mostrar la notificación.");
    }
  }

  async function test(permissionAsk: Promise<NotificationPermission>) {
    setTesting(true);
    setMessage(null);
    try {
      const permission = await permissionAsk;
      if (permission === "denied") {
        setMessage("El navegador bloqueó las notificaciones. Hacé clic en el icono de permisos de la barra para permitirlas.");
        setTesting(false);
        return;
      }
      if (permission !== "granted") {
        setMessage("Se necesita permiso del navegador para recibir notificaciones.");
        setTesting(false);
        return;
      }
      const where = await showNotice("Taskie", "Así te vamos a avisar cuando tengas tareas para entregar.");
      setMessage(
        where === "push"
          ? "Listo. Aviso de prueba enviado."
          : on
            ? "Aviso de prueba enviado en este navegador."
            : "Aviso de prueba enviado. Activá el interruptor para recibir recordatorios automáticos.",
      );
    } catch (error) {
      setMessage(error instanceof Error && error.message !== "timeout" ? error.message : "No pude mostrar el aviso.");
    }
    setTesting(false);
  }

  return (
    <section className="rounded-3xl bg-card px-4 py-4 ring-1 ring-foreground/10">
      <div className="flex items-center gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${on ? "bg-coral text-white" : "bg-muted text-muted-foreground"}`}>
          <Bell className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl leading-none">Notificaciones</p>
          <p className="mt-1 text-sm text-muted-foreground">Recordatorios de tareas del día y próximas a vencer.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => {
            const next = !on;
            void toggle(next, next ? askPermission() : null);
          }}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? "bg-coral" : "bg-muted"}`}
        >
          <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} />
          <span className="sr-only">{on ? "Desactivar notificaciones" : "Activar notificaciones"}</span>
        </button>
      </div>
      <button
        type="button"
        onClick={() => void test(askPermission())}
        disabled={testing}
        className="mt-4 h-11 w-full rounded-full bg-coral text-sm font-semibold text-white disabled:opacity-60"
      >
        {testing ? "Enviando prueba…" : "Enviar notificación de prueba"}
      </button>
      {message ? <p className="mt-3 text-sm font-semibold text-foreground">{message}</p> : null}
    </section>
  );
}
