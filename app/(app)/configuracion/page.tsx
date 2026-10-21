import { redirect } from "next/navigation";
import { CoursePicker } from "@/components/course-picker";
import { NotifyToggle } from "@/components/notify-card";
import { getCurrentUser } from "@/lib/session";

export default async function ConfiguracionPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  return (
    <div className="flex flex-col gap-4">
      <CoursePicker courses={session.courseOptions} selected={session.courseChoice} />
      <NotifyToggle enabled={session.notificationsEnabled} />
    </div>
  );
}
