import { redirect } from "next/navigation";
import { IaPanel } from "@/components/ia-panel";
import { listMessages, listTasks } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export default async function ChatPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const messages = listMessages(session.id);
  const subjects = [...new Set(listTasks(session.id).map((task) => task.subject))].sort((a, b) => a.localeCompare(b, "es"));
  return <IaPanel initial={messages} subjects={subjects} />;
}
