import { listPush } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";
import { sendPush } from "@/lib/push";

export async function POST() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const subs = listPush(user.id);
  if (subs.length === 0) return json({ ok: false, push: false, reason: "none" });
  let delivered = 0;
  let gone = 0;
  for (const sub of subs) {
    try {
      const result = await sendPush(sub, {
        title: "Taskie",
        body: "Así te vamos a avisar cuando tengas tareas para entregar.",
        url: "/inicio",
      });
      if (result === "sent") delivered += 1;
      else gone += 1;
    } catch {
      // Un aviso que no sale no frena a los otros dispositivos.
    }
  }
  return json({ ok: delivered > 0, push: delivered > 0, reason: delivered > 0 ? null : gone > 0 ? "gone" : "failed" });
}
