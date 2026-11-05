import { deleteMailAccount, findMailAccount } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";
import { forgetMail, mailInbox } from "@/lib/mail";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const account = findMailAccount(user.id);
  if (!account) return json({ linked: false });
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  const inbox = await mailInbox(user, fresh);
  if (!inbox.ok) return json({ linked: true, address: account.address, kind: account.kind, error: inbox.error });
  return json({ linked: true, address: inbox.address, kind: account.kind, items: inbox.items });
}

export async function DELETE() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  deleteMailAccount(user.id);
  forgetMail(user.id);
  return json({ ok: true });
}
