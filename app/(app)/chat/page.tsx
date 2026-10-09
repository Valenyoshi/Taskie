import { redirect } from "next/navigation";
import { IaPanel } from "@/components/ia-panel";
import { listMessages } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export default async function ChatPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const messages = listMessages(session.id);
  return <IaPanel initial={messages} streak={session.streak} />;
}
