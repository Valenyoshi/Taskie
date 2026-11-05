import { deleteUserPush, savePush, setNotifications } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";

type Body = { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | null;

function validEndpoint(value: string | undefined): value is string {
  if (!value || value.length > 1000) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => null)) as Body;
  if (!validEndpoint(body?.endpoint) || !body?.keys?.p256dh || !body.keys.auth) {
    return json({ error: "El navegador no mandó la suscripción." }, 400);
  }
  savePush(user.id, body.endpoint, body.keys.p256dh.slice(0, 200), body.keys.auth.slice(0, 100));
  setNotifications(user.id, true);
  return json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => null)) as Body;
  if (body?.endpoint) deleteUserPush(user.id, body.endpoint);
  return json({ ok: true });
}
