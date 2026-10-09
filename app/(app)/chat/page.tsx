import { redirect } from "next/navigation";
import { IaPanel } from "@/components/ia-panel";
import { listMessages, listTasks } from "@/lib/db";
import { subjectChoices } from "@/lib/lessons";
import { getCurrentUser } from "@/lib/session";

export default async function ChatPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const messages = listMessages(session.id);
  const subjects = await subjectChoices(session, listTasks(session.id).map((task) => task.subject));
  return <IaPanel initial={messages} subjects={subjects} streak={session.streak} />;
}
