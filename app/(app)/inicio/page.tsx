import { NotifyCard } from "@/components/notify-card";
import { SyncButton } from "@/components/sync-button";
import { TaskCard } from "@/components/task-card";
import { shortSubject, subjectColor } from "@/lib/subject-color";
import { getCurrentUser } from "@/lib/session";
import { homeData } from "@/lib/view";
import { redirect } from "next/navigation";

export default async function InicioPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const data = homeData(session.id);
  if (!data) redirect("/entrar");
  const { user, missions, pending, done } = data;
  const reminders = pending.filter((task) => task.shortDue === "Hoy" || task.shortDue === "Mañana" || task.shortDue === "Atrasada");

  return (
    <div className="flex flex-col gap-4">
      <section className="points-corral rise-in">
        <span className="points-coin" aria-hidden />
        <span>
          <span className="points-value">{user.points}</span>
          <span className="points-label">puntos</span>
        </span>
      </section>

      <section className="zone zone-xp rise-in">
        <p className="zone-kicker">Nivel {user.level}</p>
        <Meter label="XP" value={user.need ? user.into / user.need : 0} caption={`${user.into}/${user.need}`} />
      </section>
      <div className="grid grid-cols-2 gap-3">
        <section className="zone zone-day rise-in">
          <Meter
            label="Hoy"
            ink
            value={missions.dailyTotal ? missions.dailyRatio : 0}
            caption={missions.dailyTotal ? `${missions.dailyDone}/${missions.dailyTotal}` : "—"}
            marker={0.6}
          />
        </section>
        <section className="zone zone-week rise-in">
          <Meter
            label="Semana"
            value={missions.weeklyTotal ? missions.weeklyDone / missions.weeklyTotal : 0}
            caption={missions.weeklyTotal ? `${missions.weeklyDone}/${missions.weeklyTotal}` : "—"}
          />
        </section>
      </div>

      <NotifyCard
        enabled={user.notificationsEnabled}
        reminders={reminders.map((task) => ({
          id: task.id,
          subject: shortSubject(task.subject),
          title: task.title,
          when: task.shortDue,
          color: subjectColor(task.subject),
        }))}
      />

      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Por hacer</h2>
        <div className="flex items-center gap-2">
          {user.isDemo ? <span className="rounded-full bg-gold/25 px-2 py-1 text-xs font-semibold text-foreground">Ejemplo</span> : null}
          <SyncButton />
        </div>
      </div>
      {user.syncError ? <p className="text-sm text-destructive">{user.syncError}</p> : null}

      {pending.length === 0 ? (
        <p className="rounded-2xl bg-card px-4 py-6 text-center font-display text-xl ring-1 ring-foreground/10">Nada pendiente</p>
      ) : (
        <div className="task-stack flex flex-col gap-3">
          {pending.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
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

function Meter({
  label,
  value,
  caption,
  marker,
  ink,
}: {
  label: string;
  value: number;
  caption: string;
  marker?: number;
  ink?: boolean;
}) {
  const width = `${Math.max(0, Math.min(100, Math.round(value * 100)))}%`;
  return (
    <div className="mt-3">
      <div className="mb-1.5 flex justify-between text-xs font-bold">
        <span>{label}</span>
        <span>{caption}</span>
      </div>
        <div className={`relative h-3 overflow-hidden rounded-full ${ink ? "bg-[#2c241f]/15" : "bg-white/35"}`}>
        <div className={`meter-fill h-full rounded-full ${ink ? "bg-[#2c241f]" : "bg-white"}`} style={{ width }} />
        {marker != null ? (
          <div className={`absolute inset-y-0 w-0.5 ${ink ? "bg-white" : "bg-gold"}`} style={{ left: `${marker * 100}%` }} />
        ) : null}
      </div>
    </div>
  );
}
