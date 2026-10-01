import { findUserById } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";
import { deliverTask } from "@/lib/progress";
import { toPublic } from "@/lib/view";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  const result = deliverTask(user.id, id);
  if (!result.ok) return json({ error: result.error }, 400);
  const fresh = findUserById(user.id);
  return json({ ok: true, lines: result.lines, user: fresh ? toPublic(fresh) : null });
}
