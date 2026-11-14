import { redirect } from "next/navigation";
import { ApuntesPanel } from "@/components/apuntes-panel";
import { listApuntes } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export default async function ApuntesPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  return <ApuntesPanel notes={listApuntes(session.id)} />;
}
