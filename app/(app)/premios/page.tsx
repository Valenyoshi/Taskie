import { redirect } from "next/navigation";
import { EquipButton } from "@/components/equip-button";
import { Medal } from "@/components/medal";
import { PullMachine } from "@/components/pull-machine";
import { getCurrentUser } from "@/lib/session";
import { rewardsData } from "@/lib/view";

export default async function PremiosPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const data = rewardsData(session.id);
  if (!data) redirect("/entrar");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl">Premios</h1>
      <PullMachine points={data.user.points} cost={data.pullCost} missing={data.missing} />

      <section>
        <h2 className="mb-3 font-display text-2xl">Logros</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {data.achievements.map((achievement) => (
            <Medal key={achievement.id} unlocked={achievement.unlocked} label={achievement.name} mark={achievement.unlocked ? achievement.name.slice(0, 1) : "?"} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl">Colección</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {data.items.map((item) => (
            <div key={item.id} className="flex flex-col items-center">
              <Medal unlocked={item.owned} secret label={item.name} mark={item.owned ? item.name.slice(0, 1) : "?"} />
              {item.owned && item.kind !== "medal" ? (
                <EquipButton kind={item.kind} id={item.id} equipped={item.equipped} />
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
