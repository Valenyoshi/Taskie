import { educamosLogin, hasEducamosLogin } from "@/lib/credentials";
import { fetchNewsAttachment } from "@/lib/educamos";
import { isUser, json, requireUser } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  if (!hasEducamosLogin(user)) return json({ error: "Esta cuenta no está conectada a Educamos." }, 404);
  const login = educamosLogin(user);
  if (!login) return json({ error: "No pude abrir tus datos de Educamos." }, 400);
  const file = await fetchNewsAttachment({ url: user.educamosUrl, ...login, id, cacheKey: user.id });
  if (!file.ok) return json({ error: file.error }, 502);
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "content-type": file.type,
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
      ...(file.type.startsWith("image/") ? { "content-security-policy": "default-src 'none'" } : {}),
    },
  });
}
