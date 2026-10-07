import { redirect } from "next/navigation";
import { NotifyToggle } from "@/components/notify-card";
import { getCurrentUser } from "@/lib/session";

export default async function ConfiguracionPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  return <NotifyToggle enabled={session.notificationsEnabled} />;
}
