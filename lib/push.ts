import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import webpush from "web-push";
import { deletePush, type PushSub } from "./db";

type Keys = { publicKey: string; privateKey: string };

function keysPath(): string {
  return path.join(process.cwd(), "data", "vapid.json");
}

export function vapidKeys(): Keys {
  const file = keysPath();
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    const generated = webpush.generateVAPIDKeys();
    writeFileSync(file, JSON.stringify(generated));
  }
  return JSON.parse(readFileSync(file, "utf8")) as Keys;
}

let configured = false;

function configure(): void {
  if (configured) return;
  const keys = vapidKeys();
  webpush.setVapidDetails("mailto:racha@localhost", keys.publicKey, keys.privateKey);
  configured = true;
}

/** "gone" cuando el servicio de avisos ya no reconoce esa suscripción: se borra y hay que volver a activarlos. */
export async function sendPush(sub: PushSub, payload: { title: string; body: string; url?: string; tag?: string }): Promise<"sent" | "gone"> {
  configure();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? "/inicio", tag: payload.tag }),
      { TTL: 6 * 60 * 60, urgency: "high" },
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 403 || status === 404 || status === 410) {
      deletePush(sub.endpoint);
      return "gone";
    }
    throw error;
  }
}
