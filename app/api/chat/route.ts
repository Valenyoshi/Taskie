import { addMessage, createConversation, findConversation, listConversations, listMessages, renameConversation } from "@/lib/db";
import { answerWithModel, sanitizeChatText } from "@/lib/chat";
import { plainChatText } from "@/lib/plain-text";
import { isUser, json, requireUser } from "@/lib/http";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const conversationId = new URL(request.url).searchParams.get("conversationId");
  const conversations = listConversations(user.id);
  if (conversationId && !findConversation(user.id, conversationId)) {
    return json({ error: "Ese chat no existe." }, 404);
  }
  return json({
    conversations,
    activeConversationId: conversationId ?? conversations[0]?.id ?? null,
    messages: conversationId ? listMessages(user.id, conversationId) : [],
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => null)) as { message?: string; conversationId?: string | null } | null;
  const message = body?.message?.trim() ?? "";
  if (!message || message.length > 2000) return json({ error: "Escribí una pregunta de hasta 2000 caracteres." }, 400);
  const conversation = body?.conversationId ? findConversation(user.id, body.conversationId) : createConversation(user.id);
  if (!conversation) return json({ error: "Ese chat no existe." }, 404);
  const safeMessage = sanitizeChatText(message);
  const history = listMessages(user.id, conversation.id);
  if (conversation.title === "Nuevo chat") renameConversation(user.id, conversation.id, safeMessage);
  addMessage(user.id, conversation.id, "user", safeMessage);
  try {
    const answer = await answerWithModel(safeMessage, history, user);
    const saved = addMessage(user.id, conversation.id, "assistant", plainChatText(answer));
    return json({ ok: true, conversation: findConversation(user.id, conversation.id), reply: saved });
  } catch {
    return json({ error: "No pude responder ahora." }, 500);
  }
}
