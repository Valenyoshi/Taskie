import { educamosLogin, hasEducamosLogin } from "@/lib/credentials";
import { fetchEducamosNews, type SchoolNews } from "@/lib/educamos";
import { isUser, json, requireUser } from "@/lib/http";
import { addDays, localDateString } from "@/lib/time";

function sampleNews(timeZone: string): SchoolNews[] {
  const today = localDateString(new Date(), timeZone);
  return [
    {
      id: "00000000-0000-4000-8000-000000000001",
      title: "Jornada de ciencias abierta a las familias",
      start: addDays(today, -2),
      end: addDays(today, 5),
      text: "El viernes los cursos de secundaria muestran sus proyectos de ciencias en el patio central, de 9 a 12 h.\nTraé tu cuaderno de laboratorio.",
      links: [],
      urgent: false,
      hasAttachment: false,
      images: 0,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      title: "Clases virtuales por mantenimiento",
      start: addDays(today, -9),
      end: addDays(today, -7),
      text: "El turno tarde toma clases desde el aula virtual mientras se arregla el techo del edificio.",
      links: [],
      urgent: true,
      hasAttachment: false,
      images: 0,
    },
  ];
}

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  if (user.isDemo) return json({ news: sampleNews(user.timezone), sample: true });
  if (!hasEducamosLogin(user) || user.platform !== "educamos") {
    return json({ news: [], note: "Las noticias del tablón se leen desde Educamos. Tu cuenta está conectada a otra plataforma." });
  }
  const login = educamosLogin(user);
  if (!login) return json({ error: "No pude abrir tus datos de Educamos. Volvé a entrar." }, 400);
  const result = await fetchEducamosNews({ url: user.educamosUrl, ...login, timeZone: user.timezone, cacheKey: user.id });
  if (!result.ok) return json({ error: result.error }, 502);
  return json({ news: result.news });
}
