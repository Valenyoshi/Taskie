"use client";

import { useEffect } from "react";
import { pushSupport, subscribeDevice } from "@/lib/push-client";

/** Renueva la suscripción de este dispositivo cada vez que se abre la app, si ya dio permiso. */
export function PushRefresh({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || pushSupport() !== "ok" || Notification.permission !== "granted") return;
    if (sessionStorage.getItem("taskie-push-refreshed")) return;
    sessionStorage.setItem("taskie-push-refreshed", "1");
    void subscribeDevice().catch(() => sessionStorage.removeItem("taskie-push-refreshed"));
  }, [enabled]);
  return null;
}
