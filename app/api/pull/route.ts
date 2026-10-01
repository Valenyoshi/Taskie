import { findUserById } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";
import { buyPull } from "@/lib/progress";
import { toPublic } from "@/lib/view";

export async function POST() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const result = buyPull(user.id);
  if (!result.ok) return json({ error: result.error }, 400);
  const fresh = findUserById(user.id);
  return json({ ...result, user: fresh ? toPublic(fresh) : null });
}
