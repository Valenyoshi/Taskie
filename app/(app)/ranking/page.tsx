import { redirect } from "next/navigation";
import { Medal } from "@/components/medal";
import { getCurrentUser } from "@/lib/session";
import { rankingData, rewardsData } from "@/lib/view";

export default async function RankingPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const data = rankingData(session.id);
  const rewards = rewardsData(session.id);
  if (!data || !rewards) redirect("/entrar");

  return (
    <div className="flex flex-col gap-4">
      {data.alone ? <p className="text-sm text-muted-foreground">Solo vos, por ahora.</p> : null}
      <Board
        title="Más XP"
        tone="xp"
        rows={data.byXp.map((row, index) => ({ ...row, place: index + 1, score: `${row.xp} XP` }))}
      />
      <Board
        title="Más giros"
        tone="spins"
        rows={data.byPrizes.map((row, index) => ({
          ...row,
          place: index + 1,
          score: `${row.spins} ${row.spins === 1 ? "giro" : "giros"}`,
        }))}
      />
      <section className="logros">
        <h2 className="mb-3 font-display text-2xl">Logros</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {rewards.achievements.map((achievement) => (
            <Medal
              key={achievement.id}
              unlocked={achievement.unlocked}
              label={achievement.name}
              mark={achievement.unlocked ? achievement.name.slice(0, 1) : "?"}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Board({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: "xp" | "spins";
  rows: { id: string; place: number; name: string; level: number; score: string; me: boolean }[];
}) {
  return (
    <section className={`ranking-board ${tone}`}>
      <h2 className="font-display text-2xl">{title}</h2>
      <ol className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.id} className={`ranking-row ${row.me ? "me" : ""}`}>
            <span className="flex items-center gap-2">
              <span className="ranking-place">{row.place}</span>
              <span>
                {row.name}
                <span className="ml-2 text-xs opacity-80">nivel {row.level}</span>
              </span>
            </span>
            <span className="font-display text-lg">{row.score}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
