import { redirect } from "next/navigation";
import { IaPanel } from "@/components/ia-panel";
import { listConversations, listMessages } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export default async function ChatPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const conversations = listConversations(session.id);
  const activeConversation = conversations[0] ?? null;
  const messages = activeConversation ? listMessages(session.id, activeConversation.id) : [];
  return (
    <IaPanel
      initial={messages}
      streak={session.streak}
      conversations={conversations}
      activeConversationId={activeConversation?.id ?? null}
    />
  );
}
