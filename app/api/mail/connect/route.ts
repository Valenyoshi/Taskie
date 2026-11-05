import type { MailServers } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";
import { connectPasswordMail } from "@/lib/mail";
import { clearFailures, recordFailure, retryAfter } from "@/lib/rate-limit";

type Body = { address?: string; password?: string; servers?: Partial<MailServers> | null } | null;

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  if (user.isDemo) return json({ error: "En la cuenta de prueba no se puede vincular un correo." }, 400);
  const key = `mail-connect|${user.id}`;
  const wait = retryAfter(key, 6);
  if (wait) return json({ error: `Demasiados intentos. Probá de nuevo en ${Math.ceil(wait / 60)} min.` }, 429);
  const body = (await request.json().catch(() => null)) as Body;
  const raw = body?.servers;
  const servers =
    raw?.imapHost && raw.smtpHost
      ? {
          imapHost: String(raw.imapHost).trim().toLowerCase(),
          imapPort: Number(raw.imapPort) || 993,
          smtpHost: String(raw.smtpHost).trim().toLowerCase(),
          smtpPort: Number(raw.smtpPort) || 465,
        }
      : null;
  const result = await connectPasswordMail(user, {
    address: String(body?.address ?? "").slice(0, 254),
    password: String(body?.password ?? ""),
    servers,
  });
  if (!result.ok) {
    recordFailure(key, 15 * 60 * 1000);
    return json({ error: result.error }, 400);
  }
  clearFailures(key);
  return json({ ok: true, address: result.address });
}
