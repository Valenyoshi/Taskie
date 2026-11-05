import { redirect } from "next/navigation";
import { EventsPanel } from "@/components/events-panel";
import { getCurrentUser } from "@/lib/session";
import { calendarData } from "@/lib/view";

export default async function EventosPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const data = calendarData(session.id);
  if (!data) redirect("/entrar");
  return <EventsPanel tasks={data.tasks} today={data.today} isDemo={data.user.isDemo} />;
}
