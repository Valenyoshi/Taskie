import { redirect } from "next/navigation";
import { SubjectList } from "@/components/subject-list";
import { getCurrentUser } from "@/lib/session";
import { subjectsData } from "@/lib/view";

export default async function MateriasPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const data = subjectsData(session.id);
  if (!data) redirect("/entrar");

  return <SubjectList subjects={data.subjects} />;
}
