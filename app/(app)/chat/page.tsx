import { redirect } from "next/navigation";
import { IaPanel } from "@/components/ia-panel";
import { listConversations } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export default async function ChatPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const conversations = listConversations(session.id);
  return (
    <IaPanel
      initial={[]}
      streak={session.streak}
      conversations={conversations}
      activeConversationId={null}
    />
  );
}
