import { redirect } from "next/navigation";
import { Presentation } from "@/components/presentation";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/inicio");
  return <Presentation />;
}
