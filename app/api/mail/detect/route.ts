import { isUser, json, requireUser } from "@/lib/http";
import { detectMail, isEmail } from "@/lib/mail";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => null)) as { address?: string } | null;
  const address = body?.address?.trim().toLowerCase() ?? "";
  if (!isEmail(address)) return json({ error: "Ese correo no es válido." }, 400);
  return json({ setup: await detectMail(address) });
}
