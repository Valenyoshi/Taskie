import { redirect } from "next/navigation";
import { CoursePicker } from "@/components/course-picker";
import { NotifyToggle } from "@/components/notify-card";
import { ThemePicker } from "@/components/theme-picker";
import { getCurrentUser } from "@/lib/session";

export default async function ConfiguracionPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-2xl bg-card px-4 py-3 text-sm">
        {session.platform === "teams"
          ? `Las tareas salen de Microsoft Teams${session.teamsAccount ? `, cuenta ${session.teamsAccount}` : ""}.`
          : session.platform === "classroom"
            ? `Las tareas salen de Google Classroom${session.teamsAccount ? `, cuenta ${session.teamsAccount}` : ""}.`
            : session.isDemo
              ? "Esta cuenta usa tareas de ejemplo."
              : "Las tareas salen de Educamos y del aula de Moodle."}
      </p>
      <CoursePicker courses={session.courseOptions} selected={session.courseChoice} />
      <ThemePicker equipped={session.equippedTheme} />
      <NotifyToggle enabled={session.notificationsEnabled} />
    </div>
  );
}
