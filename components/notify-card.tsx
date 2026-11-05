"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { deviceSubscribed, pushSupport, subscribeDevice, unsubscribeDevice, workerRegistration, type PushSupport } from "@/lib/push-client";

const BLOCKED = "El navegador bloqueó las notificaciones de Taskie. Tocá el candado junto a la dirección, permití las notificaciones y recargá la página.";
const IOS = "En iPhone los avisos solo funcionan con Taskie en la pantalla de inicio: tocá Compartir, después Agregar a inicio, abrila desde ahí y activalas.";

function askPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return Promise.reject(new Error("Este navegador no muestra avisos."));
  if (Notification.permission !== "default") return Promise.resolve(Notification.permission);
  return Notification.requestPermission();
}

function problem(error: unknown, fallback: string): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") return BLOCKED;
  if (error instanceof DOMException && error.name === "AbortError") {
    return "El navegador no pudo conectarse con su servicio de avisos. Revisá la conexión y probá de nuevo.";
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export function NotifyToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [support, setSupport] = useState<PushSupport>("ok");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const found = pushSupport();
    setSupport(found);
    if (found !== "ok") {
      setChecking(false);
      return;
    }
    let alive = true;
    void deviceSubscribed()
      .then(async (subscribed) => {
        if (subscribed && enabled) await subscribeDevice().catch(() => null);
        if (alive) setOn(subscribed && enabled);
      })
      .catch(() => null)
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [enabled]);

  async function setServer(next: boolean) {
    const res = await fetch("/api/push/toggle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    if (!res.ok) throw new Error("No se pudo guardar.");
  }

  async function sendTest(): Promise<string> {
    const res = await fetch("/api/push/test", { method: "POST" });
    const data = (await res.json().catch(() => null)) as { push?: boolean; reason?: string | null } | null;
    if (data?.push) return "Listo. Te mandamos un aviso de prueba: tiene que aparecer en unos segundos.";
    if (data?.reason === "gone") {
      setOn(false);
      return "El servicio de avisos dio de baja este dispositivo. Activá el interruptor otra vez.";
    }
    const registration = await workerRegistration();
    await registration.showNotification("Taskie", { body: "Aviso de prueba.", icon: "/icon-192.png", data: { url: "/inicio" } });
    return "El aviso salió desde esta página, pero el servidor no pudo enviarlo. Probá de nuevo en un rato.";
  }

  async function turnOn(permissionAsk: Promise<NotificationPermission>) {
    const permission = await permissionAsk;
    if (permission === "denied") throw new Error(BLOCKED);
    if (permission !== "granted") throw new Error("Hace falta que permitas las notificaciones cuando el navegador lo pregunte.");
    await subscribeDevice();
    await setServer(true);
    setOn(true);
  }

  async function toggle(permissionAsk: Promise<NotificationPermission> | null) {
    setBusy(true);
    setMessage(null);
    try {
      if (permissionAsk) {
        await turnOn(permissionAsk);
        setMessage(await sendTest());
      } else {
        await unsubscribeDevice();
        await setServer(false);
        setOn(false);
        setMessage("Avisos desactivados en este dispositivo.");
      }
    } catch (error) {
      setMessage(problem(error, "No se pudieron activar los avisos."));
    }
    setBusy(false);
  }

  async function test(permissionAsk: Promise<NotificationPermission>) {
    setBusy(true);
    setMessage(null);
    try {
      if (!on) await turnOn(permissionAsk);
      setMessage(await sendTest());
    } catch (error) {
      setMessage(problem(error, "No pude mandar el aviso de prueba."));
    }
    setBusy(false);
  }

  const unavailable = support !== "ok";

  return (
    <section className="rounded-3xl bg-card px-4 py-4 ring-1 ring-foreground/10">
      <div className="flex items-center gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${on ? "bg-coral text-white" : "bg-muted text-muted-foreground"}`}>
          <Bell className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl leading-none">Notificaciones</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {checking
              ? "Revisando este dispositivo…"
              : on
                ? "Activadas en este dispositivo. Te avisamos lo que vence hoy, mañana y en las próximas horas."
                : "Avisos de lo que vence hoy, mañana y en las próximas horas."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={busy || checking || unavailable}
          onClick={() => void toggle(on ? null : askPermission())}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60 ${on ? "bg-coral" : "bg-muted"}`}
        >
          <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} />
          <span className="sr-only">{on ? "Desactivar notificaciones" : "Activar notificaciones"}</span>
        </button>
      </div>
      {unavailable ? (
        <p className="mt-3 rounded-xl bg-gold/15 px-3 py-2 text-sm font-semibold text-foreground/80">
          {support === "ios-install" ? IOS : "Este navegador no recibe avisos. Probá con Chrome, Edge o Firefox."}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void test(askPermission())}
          disabled={busy || checking}
          className="mt-4 h-11 w-full rounded-full bg-coral text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Un momento…" : "Enviar notificación de prueba"}
        </button>
      )}
      {message ? (
        <p className="mt-3 text-sm font-semibold text-foreground" aria-live="polite">
          {message}
        </p>
      ) : null}
    </section>
  );
}
