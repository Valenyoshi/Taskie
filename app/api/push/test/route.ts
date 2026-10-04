import { listPush } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";
import { sendPush } from "@/lib/push";

export async function POST() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const subs = listPush(user.id);
  if (subs.length === 0) return json({ error: "Este navegador todavía no aceptó los avisos." }, 400);
  for (const sub of subs) {
    await sendPush(sub, {
      title: "Taskie",
      body: "Así te vamos a avisar cuando tengas tareas para entregar.",
      url: "/inicio",
    });
  }
  return json({ ok: true });
}
