import { courseGroup, coursesFromNames, type SchoolCourse } from "./courses";
import type { RemoteTask } from "./educamos";
import { addDays, endOfLocalDay, localDateString } from "./time";

export const CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
];

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Falta configurar Google Classroom en el servidor: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI.");
  }
  const url = new URL(redirectUri);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) ||
      url.pathname !== "/api/auth/google/callback" || url.search || url.hash || url.username || url.password) {
    throw new Error("GOOGLE_REDIRECT_URI debe ser la URL pública de /api/auth/google/callback (HTTPS, o localhost para desarrollo).");
  }
  return { clientId, clientSecret, redirectUri };
}

export function googleAuthorizationUrl(state: string, challenge: string): string {
  const config = googleConfig();
  const params = new URLSearchParams({
    client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code",
    scope: CLASSROOM_SCOPES.join(" "), access_type: "offline", prompt: "consent select_account",
    state, code_challenge: challenge, code_challenge_method: "S256",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function googleTokens(params: Record<string, string>): Promise<{ accessToken: string; refreshToken?: string }> {
  const config = googleConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, client_id: config.clientId, client_secret: config.clientSecret }),
  });
  const data = await response.json() as { access_token?: string; refresh_token?: string; scope?: string; error?: string };
  if (!response.ok || !data.access_token) {
    if (data.error === "invalid_grant") throw new Error("La autorización de Google venció o fue revocada. Volvé a conectar Classroom en Configuración.");
    throw new Error("Google no pudo autorizar Classroom. Revisá la configuración OAuth y volvé a intentarlo.");
  }
  if (data.scope && !CLASSROOM_SCOPES.every((scope) => data.scope!.split(" ").includes(scope))) {
    throw new Error("Faltan permisos para leer las clases y tareas. Volvé a conectar Classroom y aceptá ambos permisos.");
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

type Course = { id: string; name: string };
type Work = {
  id: string; title: string; description?: string; alternateLink?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number; seconds?: number; nanos?: number };
};
type Submission = { courseWorkId: string; state: string };

async function list<T>(accessToken: string, path: string, field: string, query: Record<string, string> = {}): Promise<T[]> {
  const items: T[] = [];
  let pageToken = "";
  do {
    const url = new URL(`https://classroom.googleapis.com/v1/${path}`);
    url.search = new URLSearchParams({ ...query, pageSize: "100", ...(pageToken ? { pageToken } : {}) }).toString();
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store",
      redirect: "error", signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error("La conexión con Google venció. Volvé a conectar Classroom en Configuración.");
      if (response.status === 403) throw new Error("Google no permite leer Classroom. Revisá que la API esté habilitada y que la cuenta y el colegio permitan los permisos solicitados.");
      throw new Error("No pude traer las tareas de Classroom. Probá de nuevo más tarde.");
    }
    const data = await response.json() as Record<string, unknown> & { nextPageToken?: string };
    items.push(...((data[field] ?? []) as T[]));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return items;
}

export function classroomDue(work: Work, timeZone: string, now = new Date()): string {
  if (!work.dueDate) return endOfLocalDay(addDays(localDateString(now, timeZone), 7), timeZone);
  const { year, month, day } = work.dueDate;
  // Classroom dates and times are UTC, including omitted zero-valued hours.
  const time = work.dueTime ?? {};
  return new Date(Date.UTC(year, month - 1, day, time.hours ?? 0, time.minutes ?? 0, time.seconds ?? 0,
    Math.floor((time.nanos ?? 0) / 1000000))).toISOString();
}

export async function fetchClassroomTasks(input: {
  accessToken: string; timeZone: string;
}): Promise<{ ok: true; tasks: RemoteTask[]; courses: SchoolCourse[] } | { ok: false; error: string }> {
  try {
    const rooms = await list<Course>(input.accessToken, "courses", "courses", { studentId: "me", courseStates: "ACTIVE" });
    const tasks: RemoteTask[] = [];
    for (const room of rooms) {
      const path = `courses/${encodeURIComponent(room.id)}/courseWork`;
      const work = await list<Work>(input.accessToken, path, "courseWork", { courseWorkStates: "PUBLISHED" });
      const submissions = await list<Submission>(input.accessToken, `${path}/-/studentSubmissions`, "studentSubmissions", { userId: "me" });
      const states = new Map(submissions.map((entry) => [entry.courseWorkId, entry.state]));
      for (const item of work) {
        tasks.push({
          externalId: `classroom-${room.id}-${item.id}`, subject: room.name, title: item.title,
          description: item.description ?? "", dueAt: classroomDue(item, input.timeZone),
          status: ["TURNED_IN", "RETURNED"].includes(states.get(item.id) ?? "") ? "done" : "pending",
          needsFile: false, url: item.alternateLink ?? null, courseKey: courseGroup(room.name)?.key ?? null,
        });
      }
    }
    return { ok: true, tasks, courses: coursesFromNames(rooms.map((room) => room.name)) };
  } catch (error) {
    return { ok: false, error: error instanceof Error && error.name === "Error" ? error.message : "No pude conectar con Google Classroom. Probá de nuevo." };
  }
}
