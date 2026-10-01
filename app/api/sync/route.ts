import { isUser, json, requireUser } from "@/lib/http";
import { syncUser } from "@/lib/sync";

export async function POST() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const result = await syncUser(user.id);
  if (!result.ok) return json({ error: result.error }, 400);
  return json({ ok: true, count: result.count ?? 0 });
}
