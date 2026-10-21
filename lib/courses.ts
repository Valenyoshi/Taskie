import { listTasks, type Task, type User } from "./db";

export type SchoolCourse = { id: string; label: string };

export function courseGroup(name: string): { key: string; label: string } | null {
  const clean = name.normalize("NFD").replace(/\p{M}/gu, "");
  const es = clean.match(/(\d+)\s*[º°o]?\s*ES\s*[-–]?\s*([A-Za-z])\b/i);
  if (es && /^[A-Za-z]$/.test(es[2])) {
    const letter = es[2].toUpperCase();
    return { key: `${es[1]}-${letter}`, label: `${es[1]}º ES-${letter}` };
  }
  const patterns = [
    /(\d+)\s*[º°o]\s*(?:ano|año)\s*[-–]?\s*([A-Za-z])\b/i,
    /(\d+)\s*[º°o]\s*([A-Za-z])\b/,
  ];
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (!match || !/^[A-Za-z]$/.test(match[2])) continue;
    const letter = match[2].toUpperCase();
    return { key: `${match[1]}-${letter}`, label: `${match[1]}º ${letter}` };
  }
  return null;
}

export function coursesFromNames(names: string[]): SchoolCourse[] {
  const courses = new Map<string, string>();
  for (const name of names) {
    const group = courseGroup(name);
    if (group && !courses.has(group.key)) courses.set(group.key, group.label);
  }
  return [...courses.entries()].map(([id, label]) => ({ id, label }));
}

export function courseKeyFromTitle(title: string, peers: { title: string; courseKey?: string | null }[]): string | null {
  const needle = foldCourseText(title);
  if (needle.length < 6) return null;
  const keys = new Set<string>();
  for (const peer of peers) {
    if (!peer.courseKey) continue;
    const hay = foldCourseText(peer.title);
    if (hay && (hay.includes(needle) || needle.includes(hay))) keys.add(peer.courseKey);
  }
  return keys.size === 1 ? [...keys][0] : null;
}

function foldCourseText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/^vencimiento de\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function selectedCourseKeys(user: User): string[] | null {
  if (user.courseOptions.length < 2 || !user.courseChoice || user.courseChoice.length === 0) return null;
  return user.courseChoice;
}

export function courseNameAllowed(name: string, keys: string[] | null): boolean {
  if (!keys) return true;
  const group = courseGroup(name);
  return group ? keys.includes(group.key) : false;
}

export function courseIdForName(name: string, courses: SchoolCourse[]): string | null {
  const group = courseGroup(name);
  if (!group) return null;
  const matches = courses.filter((course) => course.id === group.key || courseGroup(course.label)?.key === group.key);
  return matches.length === 1 ? matches[0].id : group.key;
}

export function parseCourseSelect(html: string): { field: string; courses: { value: string; label: string }[] } | null {
  const selects = html.match(/<select\b[^>]*>[\s\S]*?<\/select>/gi) ?? [];
  let best: { field: string; courses: { value: string; label: string }[] } | null = null;
  for (const select of selects) {
    const open = select.slice(0, 240);
    const field = /name="([^"]+)"/i.exec(open)?.[1] ?? /id="([^"]+)"/i.exec(open)?.[1] ?? "";
    if (!/curso/i.test(`${field} ${open}`)) continue;
    const courses = [...select.matchAll(/<option\b([^>]*)>([^<]*)</gi)]
      .map((match) => ({
        value: attr(match[1], "value").trim(),
        label: decode(match[2]).replace(/\s+/g, " ").trim(),
      }))
      .filter((course) => course.value && course.label && !/^(0|-1|todos?)$/i.test(course.value) && !/^seleccion/i.test(course.label));
    if (courses.length >= 2 && (!best || courses.length > best.courses.length)) best = { field, courses };
  }
  return best?.field ? best : null;
}

export function coursesFromSelect(found: { courses: { value: string; label: string }[] }): { courses: SchoolCourse[]; keyForValue: Map<string, string> } {
  const used = new Set<string>();
  const keyForValue = new Map<string, string>();
  const courses: SchoolCourse[] = [];
  for (const option of found.courses) {
    let id = courseGroup(option.label)?.key ?? `edu:${option.value}`;
    if (used.has(id)) id = `edu:${option.value}`;
    used.add(id);
    keyForValue.set(option.value, id);
    courses.push({ id, label: option.label });
  }
  return { courses, keyForValue };
}

export function taskVisible(courseKey: string | null, courses: SchoolCourse[], choice: string[] | null): boolean {
  if (courses.length < 2 || !choice || choice.length === 0) return true;
  if (!courseKey) return true;
  const known = new Set(courses.map((course) => course.id));
  if (!known.has(courseKey)) return true;
  return choice.includes(courseKey);
}

export function visibleTasks(user: User, tasks: Task[] = listTasks(user.id)): Task[] {
  return tasks.filter((task) => taskVisible(task.courseKey, user.courseOptions, user.courseChoice));
}

function attr(tag: string, name: string): string {
  const match = new RegExp(`\\b${name}="([^"]*)"`, "i").exec(tag);
  return match ? decode(match[1]) : "";
}

function decode(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}
