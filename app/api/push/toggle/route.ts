import { setNotifications } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => null)) as { enabled?: boolean } | null;
  setNotifications(user.id, Boolean(body?.enabled));
  return json({ ok: true, enabled: Boolean(body?.enabled) });
}
