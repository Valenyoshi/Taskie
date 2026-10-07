import { redirect } from "next/navigation";
import { FocusSession } from "@/components/focus-session";
import { getCurrentUser } from "@/lib/session";

export default async function ConcentracionPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  return <FocusSession />;
}
