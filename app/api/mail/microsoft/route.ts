import { isUser, json, requireUser } from "@/lib/http";
import { pollMicrosoftMail, startMicrosoftMail } from "@/lib/mail";

export async function POST() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  if (user.isDemo) return json({ error: "En la cuenta de prueba no se puede vincular un correo." }, 400);
  const started = await startMicrosoftMail(user);
  if (!started.ok) return json({ error: started.error }, 400);
  return json({ code: started.code, url: started.url, expiresIn: started.expiresIn });
}

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const polled = await pollMicrosoftMail(user);
  if (!polled.ok) return json({ error: polled.error }, 400);
  return json({ state: polled.state, address: polled.address });
}
