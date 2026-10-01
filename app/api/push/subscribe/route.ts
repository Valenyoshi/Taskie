import { savePush, setNotifications } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => null)) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  } | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return json({ error: "El navegador no mandó la suscripción." }, 400);
  }
  savePush(user.id, body.endpoint, body.keys.p256dh, body.keys.auth);
  setNotifications(user.id, true);
  return json({ ok: true });
}
