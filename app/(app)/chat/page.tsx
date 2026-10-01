import { redirect } from "next/navigation";
import { ChatBox } from "@/components/chat-box";
import { listMessages } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export default async function ChatPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const messages = listMessages(session.id);
  return (
    <div>
      <h1 className="mb-3 font-display text-3xl">Chat</h1>
      <ChatBox initial={messages} />
    </div>
  );
}
