import { redirect } from "next/navigation";
import { IaPanel } from "@/components/ia-panel";
import { getCurrentUser } from "@/lib/session";

export default async function ChatPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  return (
    <IaPanel initial={[]} activeConversationId={null} />
  );
}
