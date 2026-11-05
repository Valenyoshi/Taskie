import { isUser, json, requireUser } from "@/lib/http";
import { mailReply } from "@/lib/mail";
import { recordFailure, retryAfter } from "@/lib/rate-limit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const key = `mail-reply|${user.id}`;
  if (retryAfter(key, 20)) return json({ error: "Mandaste muchas respuestas seguidas. Esperá un rato." }, 429);
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const result = await mailReply(user, decodeURIComponent(id), String(body?.text ?? ""));
  if (!result.ok) return json({ error: result.error }, 400);
  recordFailure(key, 60 * 60 * 1000);
  return json({ ok: true, to: result.to });
}
