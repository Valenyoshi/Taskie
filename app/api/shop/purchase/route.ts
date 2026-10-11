import { isUser, json, requireUser } from "@/lib/http";
import { purchaseReward } from "@/lib/progress";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return json({ error: "Elegí un producto." }, 400);
  const result = purchaseReward(user.id, body.id);
  if (!result.ok) return json({ error: result.error }, 400);
  return json({ ok: true });
}
