import { addMessage, listMessages } from "@/lib/db";
import { answerWithModel, sanitizeChatText } from "@/lib/chat";
import { isUser, json, requireUser } from "@/lib/http";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => null)) as { message?: string } | null;
  const message = body?.message?.trim() ?? "";
  if (!message || message.length > 2000) return json({ error: "Escribí una pregunta, de hasta 2000 caracteres." }, 400);
  const history = listMessages(user.id);
  const safeMessage = sanitizeChatText(message);
  addMessage(user.id, "user", safeMessage);
  try {
    const answer = await answerWithModel(safeMessage, history, user);
    const saved = addMessage(user.id, "assistant", answer);
    return json({ ok: true, reply: saved });
  } catch {
    return json({ error: "No pude responder ahora." }, 500);
  }
}
