import { courseGroup, courseIdForName, courseKeyFromTitle, coursesFromNames, type SchoolCourse } from "./courses";
import { educamosLogin, hasEducamosLogin } from "./credentials";
import { dropOldUntracked, findUserById, insertTask, listTasks, openEducamosLogin, saveCourseDiscovery, setSyncResult, tagTaskCourse, type User } from "./db";
import { fetchEducamosTasks, fetchLmsAssignmentStatuses, fetchLmsUploads, lmsBase } from "./educamos";
import { fetchClassroomTasks } from "./classroom";
import { fetchTeamsTasks, loginTeams } from "./teams";
import { localDateString, zonedTimeToUtc } from "./time";

export async function syncUser(userId: string): Promise<{ ok: boolean; error?: string; count?: number }> {
  const user = findUserById(userId);
  if (!user) return { ok: false, error: "No encontré tu cuenta." };
  if (user.platform === "teams") return syncTeams(user);
  if (user.platform === "classroom") return syncClassroom(user);
  if (!hasEducamosLogin(user)) {
    const error = user.isDemo
      ? "Esta cuenta de prueba usa tareas de ejemplo, no las de un colegio."
      : "Falta la URL, el usuario o la contraseña de Educamos.";
    setSyncResult(userId, error);
    return { ok: false, error };
  }

  const login = educamosLogin(user);
  if (!login) {
    const error = "No pude abrir las credenciales cifradas de Educamos. Volvé a crear la cuenta.";
    setSyncResult(userId, error);
    return { ok: false, error };
  }
  const { username, password } = login;

  const result = await fetchEducamosTasks({
    url: user.educamosUrl,
    username,
    password,
    timeZone: user.timezone,
  });
  const classroom = lmsBase(user.educamosUrl, user.lmsUrl);
  const uploads = classroom
    ? await fetchLmsUploads({
        lmsUrl: classroom,
        username,
        password,
        timeZone: user.timezone,
      })
    : { ok: true as const, tasks: [] };
  const existingLms = classroom
    ? listTasks(userId)
        .filter((task) => task.source === "lms" && task.externalId && task.educamosUrl)
        .map((task) => ({ externalId: task.externalId as string, url: task.educamosUrl, task }))
    : [];
  const checkedLms = classroom
    ? await fetchLmsAssignmentStatuses({
        lmsUrl: classroom,
        username,
        password,
        tasks: existingLms.map(({ externalId, url }) => ({ externalId, url })),
      })
    : [];
  const checkedById = new Map(checkedLms.map((item) => [item.externalId, item.status]));

  if (!result.ok && !uploads.ok) {
    setSyncResult(userId, result.error);
    return { ok: false, error: result.error };
  }

  const educamosCourses = result.ok ? result.courses ?? [] : [];
  const classroomCourses = uploads.ok ? uploads.courses ?? [] : [];
  const remembered = coursesFromNames(listTasks(userId).map((task) => task.subject));
  const courses: SchoolCourse[] =
    educamosCourses.length >= 2
      ? educamosCourses
      : classroomCourses.length >= 2
        ? classroomCourses
        : remembered.length >= 2
          ? remembered
          : [];

  const now = new Date().toISOString();
  const tasks = [
    ...(result.ok ? result.tasks.map((task) => ({ ...task, source: "educamos" })) : []),
    ...(uploads.ok ? uploads.tasks.map((task) => ({ ...task, source: "lms" })) : []),
    ...existingLms
      .filter(({ externalId }) => checkedById.has(externalId))
      .map(({ task, externalId }) => ({
        externalId,
        subject: task.subject,
        title: task.title,
        description: task.description,
        dueAt: task.dueAt,
        status: checkedById.get(externalId) ?? task.status,
        needsFile: task.needsFile,
        url: task.educamosUrl,
        source: "lms",
        courseKey: task.courseKey,
      })),
  ];
  const courseKeyFor = (subject: string, title: string, explicit?: string | null) => {
    if (explicit && courses.some((course) => course.id === explicit)) return explicit;
    return (
      courseIdForName(subject, courses) ??
      explicit ??
      courseGroup(subject)?.key ??
      courseKeyFromTitle(title, tasks) ??
      null
    );
  };
  for (const task of tasks) {
    insertTask({
      id: crypto.randomUUID(),
      userId,
      externalId: task.externalId,
      subject: task.subject,
      title: task.title,
      description: task.description,
      dueAt: task.dueAt,
      status: task.status,
      source: task.source,
      educamosUrl: task.url,
      needsFile: task.source === "lms" ? true : task.needsFile,
      courseKey: courseKeyFor(task.subject, task.title, task.courseKey),
      createdAt: now,
    });
    const key = courseKeyFor(task.subject, task.title, task.courseKey);
    if (task.externalId && key) tagTaskCourse(userId, task.externalId, key);
  }
  saveCourseDiscovery(userId, courses);
  const today = localDateString(new Date(), user.timezone);
  dropOldUntracked(userId, zonedTimeToUtc(today, "00:00:00", user.timezone).toISOString());
  const error = !result.ok ? result.error : !uploads.ok ? uploads.error : null;
  setSyncResult(userId, error);
  return error ? { ok: false, error, count: tasks.length } : { ok: true, count: tasks.length };
}

async function syncTeams(user: User): Promise<{ ok: boolean; error?: string; count?: number }> {
  const login = openEducamosLogin(user);
  if (!login) {
    const error = "Falta el usuario o la contraseña de Teams. Volvé a crear la cuenta.";
    setSyncResult(user.id, error);
    return { ok: false, error };
  }
  const access = await loginTeams(login.username, login.password);
  if (!access.ok) {
    setSyncResult(user.id, access.error);
    return access;
  }
  const result = await fetchTeamsTasks(access.accessToken);
  if (!result.ok) {
    setSyncResult(user.id, result.error);
    return result;
  }
  const now = new Date().toISOString();
  for (const task of result.tasks) {
    insertTask({
      id: crypto.randomUUID(),
      userId: user.id,
      externalId: task.externalId,
      subject: task.subject,
      title: task.title,
      description: task.description,
      dueAt: task.dueAt,
      status: task.status,
      source: "teams",
      educamosUrl: task.url,
      needsFile: false,
      courseKey: task.courseKey ?? courseGroup(task.subject)?.key ?? null,
      createdAt: now,
    });
  }
  saveCourseDiscovery(user.id, result.courses);
  const today = localDateString(new Date(), user.timezone);
  dropOldUntracked(user.id, zonedTimeToUtc(today, "00:00:00", user.timezone).toISOString());
  setSyncResult(user.id, null);
  return { ok: true, count: result.tasks.length };
}

async function syncClassroom(user: User): Promise<{ ok: boolean; error?: string; count?: number }> {
  const login = openEducamosLogin(user);
  if (!login) {
    const error = "Falta el correo o la contraseña de Google. Volvé a crear la cuenta.";
    setSyncResult(user.id, error);
    return { ok: false, error };
  }
  const result = await fetchClassroomTasks({
    username: login.username,
    password: login.password,
    timeZone: user.timezone,
  });
  if (!result.ok) {
    setSyncResult(user.id, result.error);
    return result;
  }
  const now = new Date().toISOString();
  for (const task of result.tasks) {
    insertTask({
      id: crypto.randomUUID(),
      userId: user.id,
      externalId: task.externalId,
      subject: task.subject,
      title: task.title,
      description: task.description,
      dueAt: task.dueAt,
      status: task.status,
      source: "classroom",
      educamosUrl: task.url,
      needsFile: false,
      courseKey: task.courseKey ?? courseGroup(task.subject)?.key ?? null,
      createdAt: now,
    });
  }
  saveCourseDiscovery(user.id, result.courses);
  const today = localDateString(new Date(), user.timezone);
  dropOldUntracked(user.id, zonedTimeToUtc(today, "00:00:00", user.timezone).toISOString());
  setSyncResult(user.id, null);
  return { ok: true, count: result.tasks.length };
}
