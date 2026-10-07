import { listPush } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";
import { sendPush } from "@/lib/push";

export async function POST() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const subs = listPush(user.id);
  if (subs.length === 0) return json({ ok: false, push: false });
  let delivered = 0;
  for (const sub of subs) {
    try {
      await sendPush(sub, {
        title: "Taskie",
        body: "Así te vamos a avisar cuando tengas tareas para entregar.",
        url: "/inicio",
      });
      delivered += 1;
    } catch {
      // Un aviso que no sale no esconde el de prueba del navegador.
    }
  }
  return json({ ok: delivered > 0, push: delivered > 0 });
}
