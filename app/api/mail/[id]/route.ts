import { isUser, json, requireUser } from "@/lib/http";
import { mailRead } from "@/lib/mail";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  const result = await mailRead(user, decodeURIComponent(id));
  if (!result.ok) return json({ error: result.error }, 400);
  return json({ message: result.message });
}
