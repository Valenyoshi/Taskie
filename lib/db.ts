import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";

export type User = {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  educamosUrl: string | null;
  educamosUsername: string | null;
  educamosPasswordEnc: string | null;
  xp: number;
  points: number;
  streak: number;
  lastOpenDate: string | null;
  timezone: string;
  notificationsEnabled: boolean;
  equippedTheme: string | null;
  equippedFrame: string | null;
  equippedTitle: string | null;
  lmsUrl: string | null;
  syncError: string | null;
  lastSyncAt: string | null;
  isDemo: boolean;
  pulled: boolean;
  spins: number;
  foundSuper: boolean;
  createdAt: string;
};

export type Task = {
  id: string;
  userId: string;
  externalId: string | null;
  subject: string;
  title: string;
  description: string;
  dueAt: string;
  status: "pending" | "done";
  completedAt: string | null;
  onTime: boolean | null;
  source: string;
  educamosUrl: string | null;
  fileName: string | null;
  filePath: string | null;
  needsFile: boolean;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type UserRow = {
  id: string;
  name: string;
  username: string;
  password_hash: string;
  educamos_url: string | null;
  educamos_username: string | null;
  educamos_password_enc: string | null;
  lms_url: string | null;
  xp: number;
  points: number;
  streak: number;
  last_open_date: string | null;
  timezone: string;
  notifications_enabled: number;
  equipped_theme: string | null;
  equipped_frame: string | null;
  equipped_title: string | null;
  sync_error: string | null;
  last_sync_at: string | null;
  is_demo: number;
  pulled: number;
  spins: number;
  found_super: number;
  created_at: string;
};

type TaskRow = {
  id: string;
  user_id: string;
  external_id: string | null;
  subject: string;
  title: string;
  description: string;
  due_at: string;
  status: "pending" | "done";
  completed_at: string | null;
  on_time: number | null;
  source: string;
  educamos_url: string | null;
  file_name: string | null;
  file_path: string | null;
  needs_file: number;
  created_at: string;
};

const globalForDb = globalThis as unknown as { rachaDb?: Database.Database; rachaTuned?: boolean };

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    passwordHash: row.password_hash,
    educamosUrl: row.educamos_url,
    educamosUsername: row.educamos_username,
    educamosPasswordEnc: row.educamos_password_enc,
    lmsUrl: row.lms_url ?? null,
    xp: row.xp,
    points: row.points,
    streak: row.streak,
    lastOpenDate: row.last_open_date,
    timezone: row.timezone,
    notificationsEnabled: row.notifications_enabled === 1,
    equippedTheme: row.equipped_theme,
    equippedFrame: row.equipped_frame,
    equippedTitle: row.equipped_title,
    syncError: row.sync_error,
    lastSyncAt: row.last_sync_at,
    isDemo: row.is_demo === 1,
    pulled: row.pulled === 1,
    spins: row.spins ?? 0,
    foundSuper: row.found_super === 1,
    createdAt: row.created_at,
  };
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    externalId: row.external_id,
    subject: row.subject,
    title: row.title,
    description: row.description,
    dueAt: row.due_at,
    status: row.status,
    completedAt: row.completed_at,
    onTime: row.on_time == null ? null : row.on_time === 1,
    source: row.source,
    educamosUrl: row.educamos_url,
    fileName: row.file_name,
    filePath: row.file_path,
    needsFile: row.needs_file === 1,
    createdAt: row.created_at,
  };
}

export function getDb(): Database.Database {
  if (!globalForDb.rachaDb) {
    const dir = path.join(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    const db = new Database(path.join(dir, "racha.db"));
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        educamos_url TEXT,
        educamos_username TEXT,
        educamos_password_enc TEXT,
        xp INTEGER NOT NULL DEFAULT 0,
        points INTEGER NOT NULL DEFAULT 0,
        streak INTEGER NOT NULL DEFAULT 0,
        last_open_date TEXT,
        timezone TEXT NOT NULL,
        notifications_enabled INTEGER NOT NULL DEFAULT 1,
        equipped_theme TEXT,
        equipped_frame TEXT,
        equipped_title TEXT,
        sync_error TEXT,
        last_sync_at TEXT,
        is_demo INTEGER NOT NULL DEFAULT 0,
        pulled INTEGER NOT NULL DEFAULT 0,
        spins INTEGER NOT NULL DEFAULT 0,
        found_super INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        external_id TEXT,
        subject TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        due_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        completed_at TEXT,
        on_time INTEGER,
        source TEXT NOT NULL,
        educamos_url TEXT,
        file_name TEXT,
        file_path TEXT,
        needs_file INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, external_id)
      );
      CREATE TABLE IF NOT EXISTS mission_claims (
        user_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        period_key TEXT NOT NULL,
        xp INTEGER NOT NULL,
        points INTEGER NOT NULL,
        claimed_at TEXT NOT NULL,
        PRIMARY KEY (user_id, kind, period_key)
      );
      CREATE TABLE IF NOT EXISTS user_achievements (
        user_id TEXT NOT NULL,
        achievement_id TEXT NOT NULL,
        unlocked_at TEXT NOT NULL,
        PRIMARY KEY (user_id, achievement_id)
      );
      CREATE TABLE IF NOT EXISTS user_rewards (
        user_id TEXT NOT NULL,
        reward_id TEXT NOT NULL,
        obtained_at TEXT NOT NULL,
        PRIMARY KEY (user_id, reward_id)
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS notification_log (
        user_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        ref_key TEXT NOT NULL,
        sent_on TEXT NOT NULL,
        PRIMARY KEY (user_id, kind, ref_key)
      );
    `);
    globalForDb.rachaDb = db;
  }
  const columns = globalForDb.rachaDb.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "tracked")) {
    globalForDb.rachaDb.exec("ALTER TABLE tasks ADD COLUMN tracked INTEGER NOT NULL DEFAULT 0");
  }
  const userColumns = globalForDb.rachaDb.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userColumns.some((column) => column.name === "lms_url")) {
    globalForDb.rachaDb.exec("ALTER TABLE users ADD COLUMN lms_url TEXT");
  }
  if (!userColumns.some((column) => column.name === "spins")) {
    globalForDb.rachaDb.exec("ALTER TABLE users ADD COLUMN spins INTEGER NOT NULL DEFAULT 0");
    globalForDb.rachaDb.exec(
      "UPDATE users SET spins = (SELECT COUNT(*) FROM user_rewards WHERE user_rewards.user_id = users.id)",
    );
  }
  if (!globalForDb.rachaTuned) {
    globalForDb.rachaDb.pragma("journal_mode = WAL");
    globalForDb.rachaDb.pragma("busy_timeout = 4000");
    globalForDb.rachaDb.pragma("synchronous = NORMAL");
    globalForDb.rachaDb.pragma("temp_store = MEMORY");
    globalForDb.rachaDb.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_at);
      CREATE INDEX IF NOT EXISTS idx_chat_user_time ON chat_messages(user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_rewards_user ON user_rewards(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    `);
    globalForDb.rachaTuned = true;
  }
  return globalForDb.rachaDb;
}

export function transaction<T>(fn: () => T): T {
  return getDb().transaction(fn)();
}

export function createUser(input: {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  educamosUrl: string | null;
  educamosUsername: string | null;
  educamosPasswordEnc: string | null;
  lmsUrl?: string | null;
  timezone: string;
  isDemo: boolean;
}): void {
  getDb()
    .prepare(
      `INSERT INTO users (
        id, name, username, password_hash, educamos_url, educamos_username, educamos_password_enc,
        lms_url, timezone, is_demo, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.name,
      input.username,
      input.passwordHash,
      input.educamosUrl,
      input.educamosUsername,
      input.educamosPasswordEnc,
      input.lmsUrl ?? null,
      input.timezone,
      input.isDemo ? 1 : 0,
      new Date().toISOString(),
    );
}

export function findUserByUsername(username: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE username = ?").get(username) as UserRow | undefined;
  return row ? mapUser(row) : null;
}

export function findUserById(id: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? mapUser(row) : null;
}

export function listUsers(): User[] {
  const rows = getDb().prepare("SELECT * FROM users").all() as UserRow[];
  return rows.map(mapUser);
}

export function addXpPoints(userId: string, xp: number, points: number): void {
  getDb().prepare("UPDATE users SET xp = xp + ?, points = points + ? WHERE id = ?").run(xp, points, userId);
}

export function spendPoints(userId: string, points: number): boolean {
  const result = getDb()
    .prepare("UPDATE users SET points = points - ? WHERE id = ? AND points >= ?")
    .run(points, userId, points);
  return result.changes === 1;
}

export function setOpenDay(userId: string, streak: number, day: string, xpGain: number, pointsGain = 0): boolean {
  const result = getDb()
    .prepare(
      `UPDATE users SET streak = ?, last_open_date = ?, xp = xp + ?, points = points + ?
       WHERE id = ? AND (last_open_date IS NULL OR last_open_date != ?)`,
    )
    .run(streak, day, xpGain, pointsGain, userId, day);
  return result.changes === 1;
}

export function setSyncResult(userId: string, error: string | null): void {
  getDb()
    .prepare("UPDATE users SET sync_error = ?, last_sync_at = ? WHERE id = ?")
    .run(error, new Date().toISOString(), userId);
}

export function setNotifications(userId: string, enabled: boolean): void {
  getDb().prepare("UPDATE users SET notifications_enabled = ? WHERE id = ?").run(enabled ? 1 : 0, userId);
}

export function setEquipped(userId: string, kind: "theme" | "frame" | "title", rewardId: string | null): void {
  const column = kind === "theme" ? "equipped_theme" : kind === "frame" ? "equipped_frame" : "equipped_title";
  getDb().prepare(`UPDATE users SET ${column} = ? WHERE id = ?`).run(rewardId, userId);
}

export function markPulled(userId: string, foundSuper: boolean): void {
  getDb()
    .prepare("UPDATE users SET pulled = 1, spins = spins + 1, found_super = CASE WHEN ? = 1 THEN 1 ELSE found_super END WHERE id = ?")
    .run(foundSuper ? 1 : 0, userId);
}

export function createSession(userId: string): string {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  getDb().prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expires);
  return token;
}

export function userIdFromSession(token: string): string | null {
  const row = getDb()
    .prepare("SELECT user_id, expires_at FROM sessions WHERE token = ?")
    .get(token) as { user_id: string; expires_at: string } | undefined;
  if (!row) return null;
  if (row.expires_at < new Date().toISOString()) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return row.user_id;
}

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function insertTask(task: Omit<Task, "fileName" | "filePath" | "completedAt" | "onTime" | "status"> & { status?: Task["status"] }): void {
  getDb()
    .prepare(
      `INSERT INTO tasks (
        id, user_id, external_id, subject, title, description, due_at, status, source, educamos_url, needs_file, created_at, tracked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 1)
      ON CONFLICT(user_id, external_id) DO UPDATE SET
        subject = excluded.subject,
        title = excluded.title,
        description = excluded.description,
        due_at = excluded.due_at,
        educamos_url = excluded.educamos_url,
        needs_file = excluded.needs_file,
        tracked = 1
      WHERE tasks.status = 'pending'`,
    )
    .run(
      task.id,
      task.userId,
      task.externalId,
      task.subject,
      task.title,
      task.description,
      task.dueAt,
      task.source,
      task.educamosUrl,
      task.needsFile ? 1 : 0,
      task.createdAt,
    );
}

export function listTasks(userId: string): Task[] {
  const rows = getDb()
    .prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY due_at ASC")
    .all(userId) as TaskRow[];
  return rows.map(mapTask);
}

export function getTask(id: string): Task | null {
  const row = getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
  return row ? mapTask(row) : null;
}

export function completeTask(id: string, userId: string, completedAt: string, onTime: boolean): boolean {
  const result = getDb()
    .prepare(
      `UPDATE tasks SET status = 'done', completed_at = ?, on_time = ?
       WHERE id = ? AND user_id = ? AND status = 'pending'`,
    )
    .run(completedAt, onTime ? 1 : 0, id, userId);
  return result.changes === 1;
}

export function attachFile(id: string, userId: string, fileName: string, filePath: string): boolean {
  const result = getDb()
    .prepare("UPDATE tasks SET file_name = ?, file_path = ? WHERE id = ? AND user_id = ?")
    .run(fileName, filePath, id, userId);
  return result.changes === 1;
}

export function dropOldUntracked(userId: string, startOfTodayIso: string): void {
  getDb()
    .prepare(
      `DELETE FROM tasks
       WHERE user_id = ? AND source = 'educamos' AND status = 'pending' AND tracked = 0 AND due_at < ?`,
    )
    .run(userId, startOfTodayIso);
}

export function hasClaim(userId: string, kind: string, periodKey: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 AS ok FROM mission_claims WHERE user_id = ? AND kind = ? AND period_key = ?")
    .get(userId, kind, periodKey);
  return Boolean(row);
}

export function addClaim(userId: string, kind: string, periodKey: string, xp: number, points: number): boolean {
  const result = getDb()
    .prepare(
      `INSERT OR IGNORE INTO mission_claims (user_id, kind, period_key, xp, points, claimed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(userId, kind, periodKey, xp, points, new Date().toISOString());
  return result.changes === 1;
}

export function listAchievementIds(userId: string): string[] {
  const rows = getDb()
    .prepare("SELECT achievement_id FROM user_achievements WHERE user_id = ?")
    .all(userId) as { achievement_id: string }[];
  return rows.map((row) => row.achievement_id);
}

export function addAchievement(userId: string, achievementId: string): boolean {
  const result = getDb()
    .prepare("INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)")
    .run(userId, achievementId, new Date().toISOString());
  return result.changes === 1;
}

export function countDoneTasksByUser(): Record<string, number> {
  const rows = getDb()
    .prepare("SELECT user_id AS userId, COUNT(*) AS n FROM tasks WHERE status = 'done' GROUP BY user_id")
    .all() as { userId: string; n: number }[];
  return Object.fromEntries(rows.map((row) => [row.userId, row.n]));
}

export function rewardIdsByUser(): Record<string, string[]> {
  const rows = getDb().prepare("SELECT user_id, reward_id FROM user_rewards").all() as { user_id: string; reward_id: string }[];
  const grouped: Record<string, string[]> = {};
  for (const row of rows) {
    const list = grouped[row.user_id] ?? [];
    list.push(row.reward_id);
    grouped[row.user_id] = list;
  }
  return grouped;
}

export function listRewardIds(userId: string): string[] {
  const rows = getDb()
    .prepare("SELECT reward_id FROM user_rewards WHERE user_id = ? ORDER BY obtained_at ASC")
    .all(userId) as { reward_id: string }[];
  return rows.map((row) => row.reward_id);
}

export function addReward(userId: string, rewardId: string): boolean {
  const result = getDb()
    .prepare("INSERT OR IGNORE INTO user_rewards (user_id, reward_id, obtained_at) VALUES (?, ?, ?)")
    .run(userId, rewardId, new Date().toISOString());
  return result.changes === 1;
}

export function listMessages(userId: string): ChatMessage[] {
  const rows = getDb()
    .prepare(
      "SELECT id, role, content, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 80",
    )
    .all(userId) as { id: string; role: "user" | "assistant"; content: string; created_at: string }[];
  return rows
    .reverse()
    .map((row) => ({ id: row.id, role: row.role, content: row.content, createdAt: row.created_at }));
}

export function addMessage(userId: string, role: "user" | "assistant", content: string): ChatMessage {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
  getDb()
    .prepare("INSERT INTO chat_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(message.id, userId, message.role, message.content, message.createdAt);
  return message;
}

export type PushSub = { id: string; userId: string; endpoint: string; p256dh: string; auth: string };

export function savePush(userId: string, endpoint: string, p256dh: string, auth: string): void {
  getDb()
    .prepare(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    )
    .run(crypto.randomUUID(), userId, endpoint, p256dh, auth, new Date().toISOString());
}

export function listPush(userId: string): PushSub[] {
  const rows = getDb()
    .prepare("SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?")
    .all(userId) as { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }[];
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
  }));
}

export function deletePush(endpoint: string): void {
  getDb().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
}

export function hasNotification(userId: string, kind: string, refKey: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 AS ok FROM notification_log WHERE user_id = ? AND kind = ? AND ref_key = ?")
    .get(userId, kind, refKey);
  return Boolean(row);
}

export function logNotification(userId: string, kind: string, refKey: string, sentOn: string): void {
  getDb()
    .prepare("INSERT OR IGNORE INTO notification_log (user_id, kind, ref_key, sent_on) VALUES (?, ?, ?, ?)")
    .run(userId, kind, refKey, sentOn);
}
