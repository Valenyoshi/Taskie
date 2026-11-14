import { CoursePicker } from "@/components/course-picker";
import { GoalBars } from "@/components/goal-bars";
import { StreakFlame } from "@/components/streak-flame";
import { SyncButton } from "@/components/sync-button";
import { TaskCalendar } from "@/components/task-calendar";
import { TaskCard } from "@/components/task-card";
import { getCurrentUser } from "@/lib/session";
import { calendarData, homeData } from "@/lib/view";
import { redirect } from "next/navigation";

export default async function InicioPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const data = homeData(session.id);
  if (!data) redirect("/entrar");
  const { user, missions, pending, done, courses, courseChoice } = data;
  const calendar = calendarData(session.id);
  const homework = pending.filter((task) => task.kind === "tarea");
  const readings = pending.filter((task) => task.kind === "lectura");
  const uploads = pending.filter((task) => task.kind === "archivo");

  return (
    <div className="flex flex-col gap-4">
      <CoursePicker courses={courses} selected={courseChoice} />
      <StreakFlame days={user.streak} />

      {calendar ? <TaskCalendar tasks={calendar.tasks} today={calendar.today} /> : null}

      <GoalBars
        dailyClosed={missions.dailyClosed}
        dailyTotal={missions.dailyTotal}
        weeklyClosed={missions.weeklyClosed}
        weeklyTotal={missions.weeklyTotal}
      />

      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">{homework.length === 0 && readings.length > 0 ? "Lecturas" : "Por hacer"}</h2>
        <SyncButton autoSync={!user.isDemo} />
      </div>
      {user.syncError ? <p className="text-sm text-destructive">{user.syncError}</p> : null}

      {homework.length === 0 && readings.length === 0 ? (
        <p className="rounded-2xl bg-card px-4 py-6 text-center font-display text-xl ring-1 ring-foreground/10">Nada pendiente</p>
      ) : homework.length > 0 ? (
        <div className="task-stack flex flex-col gap-3">
          {homework.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : null}

      {readings.length > 0 ? (
        <>
          {homework.length > 0 ? <h2 className="font-display text-2xl">Lecturas</h2> : null}
          <p className="text-sm text-muted-foreground">
            Abrí la tarjeta y tocá Hacer la lectura. Se abre acá, y cuando la entregues se marca sola.
          </p>
          <div className="task-stack flex flex-col gap-3">
            {readings.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </>
      ) : null}

      {uploads.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Para subir</h2>
          </div>
          <div className="task-stack flex flex-col gap-3">
            {uploads.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </>
      ) : user.isDemo ? null : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Para subir</h2>
          </div>
          <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm ring-1 ring-foreground/10">
            No hay puntos de entrega. Actualizá para traer los del aula.
          </p>
        </>
      )}

      {done.length > 0 ? (
        <details className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <summary className="cursor-pointer font-medium">Hechas · {done.length}</summary>
          <div className="mt-3 flex flex-col gap-3">
            {done.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </details>
      ) : null}

    </div>
  );
}

