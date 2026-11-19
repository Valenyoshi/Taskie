import { redirect } from "next/navigation";
import { CoursePicker } from "@/components/course-picker";
import { NotifyToggle } from "@/components/notify-card";
import { ThemePicker } from "@/components/theme-picker";
import { getCurrentUser } from "@/lib/session";

export default async function ConfiguracionPage({ searchParams }: {
  searchParams: Promise<{ googleError?: string; googleConnected?: string }>;
}) {
  const params = await searchParams;
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
      {session.platform === "classroom" ? (
        <div className="rounded-2xl bg-card px-4 py-3 text-sm">
          <p>{session.classroomRefreshEnc ? "Google Classroom está conectado." : "Autorizá Google Classroom para traer tus clases y tareas."}</p>
          {params.googleError ? <p role="alert" className="mt-2 text-destructive">{params.googleError}</p> : null}
          {params.googleConnected === "1" ? <p role="status" className="mt-2">Conexión y sincronización completadas.</p> : null}
          <a className="mt-3 inline-block font-semibold underline" href="/api/auth/google">
            {session.classroomRefreshEnc ? "Volver a conectar con Google" : "Conectar con Google"}
          </a>
        </div>
      ) : null}
      <CoursePicker courses={session.courseOptions} selected={session.courseChoice} />
      <ThemePicker equipped={session.equippedTheme} />
      <NotifyToggle enabled={session.notificationsEnabled} />
    </div>
  );
}
