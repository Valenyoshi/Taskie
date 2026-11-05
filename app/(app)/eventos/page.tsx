import { redirect } from "next/navigation";
import { EventsPanel } from "@/components/events-panel";
import { getCurrentUser } from "@/lib/session";
import { calendarData } from "@/lib/view";

export default async function EventosPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const data = calendarData(session.id);
  if (!data) redirect("/entrar");
  const { tab } = await searchParams;
  const initialTab = tab === "calendario" || tab === "correo" ? tab : "anuncios";
  return <EventsPanel initialTab={initialTab} tasks={data.tasks} today={data.today} isDemo={data.user.isDemo} />;
}
