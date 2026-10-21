import { setCourseChoice } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
  if (!setCourseChoice(user.id, ids)) return json({ error: "Elegí al menos un curso." }, 400);
  return json({ ok: true });
}
