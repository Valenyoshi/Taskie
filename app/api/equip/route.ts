import { isUser, json, requireUser } from "@/lib/http";
import { equipReward } from "@/lib/progress";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => null)) as { kind?: string; id?: string | null } | null;
  const kind = body?.kind;
  if (kind !== "theme" && kind !== "frame" && kind !== "title") {
    return json({ error: "No sé qué querés equipar." }, 400);
  }
  const result = equipReward(user.id, kind, body?.id ?? null);
  if (!result.ok) return json({ error: result.error }, 400);
  return json({ ok: true });
}
