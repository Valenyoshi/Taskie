import { deleteApunte } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  if (!deleteApunte(user.id, id)) return json({ error: "No encontré ese apunte." }, 404);
  return json({ ok: true });
}
