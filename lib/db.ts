import Database from "better-sqlite3";
import path from "path";
import {
  blindIndex,
  createDataKey,
  dataDir,
  destroyLegacyKey,
  hashToken,
  hasLegacyKey,
  isSealed,
  lockDown,
  newToken,
  openLegacy,
  withUserKey,
} from "./secret";

export type User = {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  educamosUrl: string | null;
  educamosUsernameEnc: string | null;
  educamosPasswordEnc: string | null;
  educamosUserIndex: string | null;
  dataKeyEnc: string | null;
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
  platform: "educamos" | "teams";
  teamsAccount: string | null;
  teamsRefreshEnc: string | null;
  pulled: boolean;
  spins: number;
  foundSuper: boolean;
  createdAt: string;
  courseOptions: { id: string; label: string }[];
  courseChoice: string[] | null;
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
  courseKey: string | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ChatConversation = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type UserRow = {
  id: string;
  name: string;
  username: string;
  password_hash: string;
  educamos_url: string | null;
  educamos_username: string | null;
  educamos_password_enc: string | null;
  educamos_user_index: string | null;
  data_key_enc: string | null;
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
  course_options: string | null;
  course_choice: string | null;
  platform: string | null;
  teams_account: string | null;
  teams_refresh_enc: string | null;
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
  course_key: string | null;
};

const globalForDb = globalThis as unknown as {
  rachaDb?: Database.Database;
  rachaTuned?: boolean;
  rachaVault?: boolean;
};

export const EDUCAMOS_USER_FIELD = "educamos.username";
export const EDUCAMOS_PASSWORD_FIELD = "educamos.password";
export const TEAMS_REFRESH_FIELD = "teams.refresh";
const messageField = (id: string) => `chat.message|${id}`;
const titleField = (id: string) => `chat.title|${id}`;

export function educamosIndex(username: string): string {
  return blindIndex("educamos-user", username);
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    passwordHash: row.password_hash,
    educamosUrl: row.educamos_url,
    educamosUsernameEnc: row.educamos_username,
    educamosPasswordEnc: row.educamos_password_enc,
    educamosUserIndex: row.educamos_user_index ?? null,
    dataKeyEnc: row.data_key_enc ?? null,
    lmsUrl: row.lms_url ?? null,
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
    platform: row.platform === "teams" ? "teams" : "educamos",
    teamsAccount: row.teams_account ?? null,
    teamsRefreshEnc: row.teams_refresh_enc ?? null,
    pulled: row.pulled === 1,
    spins: row.spins ?? 0,
    foundSuper: row.found_super === 1,
    createdAt: row.created_at,
    courseOptions: parseCourses(row.course_options),
    courseChoice: parseChoice(row.course_choice),
  };
}

function parseCourses(raw: string | null | undefined): { id: string; label: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is { id: string; label: string } =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as { id?: unknown }).id === "string" &&
        typeof (item as { label?: unknown }).label === "string",
    );
  } catch {
    return [];
  }
}

function parseChoice(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const ids = parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
    return ids.length > 0 ? ids : null;
  } catch {
    return null;
  }
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
    courseKey: row.course_key ?? null,
  };
}

export function getDb(): Database.Database {
  if (!globalForDb.rachaDb) {
    const dir = dataDir();
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
        conversation_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
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
  if (!columns.some((column) => column.name === "course_key")) {
    globalForDb.rachaDb.exec("ALTER TABLE tasks ADD COLUMN course_key TEXT");
  }
  const userColumns = globalForDb.rachaDb.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userColumns.some((column) => column.name === "lms_url")) {
    globalForDb.rachaDb.exec("ALTER TABLE users ADD COLUMN lms_url TEXT");
  }
  if (!userColumns.some((column) => column.name === "educamos_user_index")) {
    globalForDb.rachaDb.exec("ALTER TABLE users ADD COLUMN educamos_user_index TEXT");
  }
  if (!userColumns.some((column) => column.name === "data_key_enc")) {
    globalForDb.rachaDb.exec("ALTER TABLE users ADD COLUMN data_key_enc TEXT");
  }
  if (!userColumns.some((column) => column.name === "course_options")) {
    globalForDb.rachaDb.exec("ALTER TABLE users ADD COLUMN course_options TEXT");
  }
  if (!userColumns.some((column) => column.name === "course_choice")) {
    globalForDb.rachaDb.exec("ALTER TABLE users ADD COLUMN course_choice TEXT");
  }
  if (!userColumns.some((column) => column.name === "platform")) {
    globalForDb.rachaDb.exec("ALTER TABLE users ADD COLUMN platform TEXT NOT NULL DEFAULT 'educamos'");
  }
  if (!userColumns.some((column) => column.name === "teams_account")) {
    globalForDb.rachaDb.exec("ALTER TABLE users ADD COLUMN teams_account TEXT");
  }
  if (!userColumns.some((column) => column.name === "teams_refresh_enc")) {
    globalForDb.rachaDb.exec("ALTER TABLE users ADD COLUMN teams_refresh_enc TEXT");
  }
  if (!userColumns.some((column) => column.name === "spins")) {
    globalForDb.rachaDb.exec("ALTER TABLE users ADD COLUMN spins INTEGER NOT NULL DEFAULT 0");
    globalForDb.rachaDb.exec(
      "UPDATE users SET spins = (SELECT COUNT(*) FROM user_rewards WHERE user_rewards.user_id = users.id)",
    );
  }
  const chatColumns = globalForDb.rachaDb.prepare("PRAGMA table_info(chat_messages)").all() as { name: string }[];
  if (!chatColumns.some((column) => column.name === "conversation_id")) {
    globalForDb.rachaDb.exec("ALTER TABLE chat_messages ADD COLUMN conversation_id TEXT");
  }
  const orphanedChats = globalForDb.rachaDb
    .prepare("SELECT DISTINCT user_id FROM chat_messages WHERE conversation_id IS NULL")
    .all() as { user_id: string }[];
  if (orphanedChats.length > 0) {
    const now = new Date().toISOString();
    const insertConversation = globalForDb.rachaDb.prepare(
      "INSERT INTO chat_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    );
    const assignMessages = globalForDb.rachaDb.prepare(
      "UPDATE chat_messages SET conversation_id = ? WHERE user_id = ? AND conversation_id IS NULL",
    );
    for (const row of orphanedChats) {
      const conversationId = crypto.randomUUID();
      insertConversation.run(conversationId, row.user_id, "Chat anterior", now, now);
      assignMessages.run(conversationId, row.user_id);
    }
  }
  if (!globalForDb.rachaTuned) {
    globalForDb.rachaDb.pragma("journal_mode = WAL");
    globalForDb.rachaDb.pragma("busy_timeout = 4000");
    globalForDb.rachaDb.pragma("synchronous = NORMAL");
    globalForDb.rachaDb.pragma("temp_store = MEMORY");
    globalForDb.rachaDb.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_at);
      CREATE INDEX IF NOT EXISTS idx_chat_user_time ON chat_messages(user_id, conversation_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_time ON chat_conversations(user_id, updated_at);
      CREATE INDEX IF NOT EXISTS idx_rewards_user ON user_rewards(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    `);
    globalForDb.rachaTuned = true;
  }
  if (!globalForDb.rachaVault) {
    migrateVault(globalForDb.rachaDb);
    globalForDb.rachaVault = true;
  }
  return globalForDb.rachaDb;
}

function ensureDataKey(db: Database.Database, userId: string, current: string | null): string {
  if (current) return current;
  const wrapped = createDataKey(userId);
  db.prepare("UPDATE users SET data_key_enc = ? WHERE id = ?").run(wrapped, userId);
  return wrapped;
}

/** Pasa al formato cifrado por usuario todo lo que quedó del formato anterior. Es idempotente. */
function migrateVault(db: Database.Database): void {
  const dir = dataDir();
  lockDown(dir, 0o700);
  lockDown(path.join(dir, "uploads"), 0o700);
  for (const file of ["racha.db", "racha.db-wal", "racha.db-shm", "master.key", "secret.key", "vapid.json"]) {
    lockDown(path.join(dir, file));
  }

  let legacyLeft = false;
  db.transaction(() => {
    const users = db
      .prepare("SELECT id, educamos_username, educamos_password_enc, educamos_user_index, data_key_enc FROM users")
      .all() as Pick<UserRow, "id" | "educamos_username" | "educamos_password_enc" | "educamos_user_index" | "data_key_enc">[];
    const saveCredentials = db.prepare(
      "UPDATE users SET educamos_username = ?, educamos_password_enc = ?, educamos_user_index = ? WHERE id = ?",
    );
    const saveMessage = db.prepare("UPDATE chat_messages SET content = ? WHERE id = ?");
    const saveTitle = db.prepare("UPDATE chat_conversations SET title = ? WHERE id = ?");

    for (const row of users) {
      const wrapped = ensureDataKey(db, row.id, row.data_key_enc);
      const messages = db
        .prepare("SELECT id, content FROM chat_messages WHERE user_id = ?")
        .all(row.id) as { id: string; content: string }[];
      const conversations = db
        .prepare("SELECT id, title FROM chat_conversations WHERE user_id = ?")
        .all(row.id) as { id: string; title: string }[];

      withUserKey(row.id, wrapped, (box) => {
        let username = row.educamos_username;
        let password = row.educamos_password_enc;
        let index = row.educamos_user_index;
        if (username && !isSealed(username)) {
          index = educamosIndex(username);
          username = box.seal(EDUCAMOS_USER_FIELD, username);
        }
        if (password && !isSealed(password)) {
          try {
            password = box.seal(EDUCAMOS_PASSWORD_FIELD, openLegacy(password));
          } catch {
            legacyLeft = true;
          }
        }
        if (
          username !== row.educamos_username ||
          password !== row.educamos_password_enc ||
          index !== row.educamos_user_index
        ) {
          saveCredentials.run(username, password, index, row.id);
        }
        for (const message of messages) {
          if (!isSealed(message.content)) saveMessage.run(box.seal(messageField(message.id), message.content), message.id);
        }
        for (const conversation of conversations) {
          if (!isSealed(conversation.title)) {
            saveTitle.run(box.seal(titleField(conversation.id), conversation.title), conversation.id);
          }
        }
      });
    }

    const sessions = db.prepare("SELECT token FROM sessions").all() as { token: string }[];
    const rehash = db.prepare("UPDATE sessions SET token = ? WHERE token = ?");
    for (const session of sessions) {
      if (!/^[0-9a-f]{64}$/.test(session.token)) rehash.run(hashToken(session.token), session.token);
    }
  })();

  if (!legacyLeft && hasLegacyKey()) destroyLegacyKey();
  db.pragma("wal_checkpoint(TRUNCATE)");
}

function userKey(userId: string): string {
  const row = getDb().prepare("SELECT data_key_enc FROM users WHERE id = ?").get(userId) as
    | { data_key_enc: string | null }
    | undefined;
  if (!row) throw new Error("No existe el usuario.");
  return ensureDataKey(getDb(), userId, row.data_key_enc);
}

/** Descifra las credenciales de Educamos solo en memoria del servidor, en el momento de usarlas. */
export function openEducamosLogin(user: User): { username: string; password: string } | null {
  if (!user.educamosUsernameEnc || !user.educamosPasswordEnc || !user.dataKeyEnc) return null;
  if (!isSealed(user.educamosUsernameEnc) || !isSealed(user.educamosPasswordEnc)) return null;
  return withUserKey(user.id, user.dataKeyEnc, (box) => ({
    username: box.open(EDUCAMOS_USER_FIELD, user.educamosUsernameEnc!),
    password: box.open(EDUCAMOS_PASSWORD_FIELD, user.educamosPasswordEnc!),
  }));
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
  educamosLogin: { username: string; password: string } | null;
  lmsUrl?: string | null;
  timezone: string;
  isDemo: boolean;
  platform?: "educamos" | "teams";
  teamsAccount?: string | null;
}): void {
  const dataKey = createDataKey(input.id);
  const sealed = input.educamosLogin
    ? withUserKey(input.id, dataKey, (box) => ({
        username: box.seal(EDUCAMOS_USER_FIELD, input.educamosLogin!.username),
        password: box.seal(EDUCAMOS_PASSWORD_FIELD, input.educamosLogin!.password),
      }))
    : null;
  getDb()
    .prepare(
      `INSERT INTO users (
        id, name, username, password_hash, educamos_url, educamos_username, educamos_password_enc,
        educamos_user_index, data_key_enc, lms_url, timezone, is_demo, created_at, platform, teams_account
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.name,
      input.username,
      input.passwordHash,
      input.educamosUrl,
      sealed?.username ?? null,
      sealed?.password ?? null,
      input.educamosLogin ? educamosIndex(input.educamosLogin.username) : null,
      dataKey,
      input.lmsUrl ?? null,
      input.timezone,
      input.isDemo ? 1 : 0,
      new Date().toISOString(),
      input.platform ?? "educamos",
      input.teamsAccount ?? null,
    );
}

export function saveTeamsConnection(userId: string, input: { refreshToken: string; account: string }): void {
  const key = userKey(userId);
  const sealed = withUserKey(userId, key, (box) => box.seal(TEAMS_REFRESH_FIELD, input.refreshToken));
  getDb()
    .prepare("UPDATE users SET platform = 'teams', teams_account = ?, teams_refresh_enc = ? WHERE id = ?")
    .run(input.account, sealed, userId);
}

export function openTeamsRefresh(user: User): string | null {
  if (!user.teamsRefreshEnc || !user.dataKeyEnc || !isSealed(user.teamsRefreshEnc)) return null;
  try {
    return withUserKey(user.id, user.dataKeyEnc, (box) => box.open(TEAMS_REFRESH_FIELD, user.teamsRefreshEnc!));
  } catch {
    return null;
  }
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

export function addPoints(userId: string, points: number): void {
  getDb().prepare("UPDATE users SET points = points + ? WHERE id = ?").run(points, userId);
}

export function spendPoints(userId: string, points: number): boolean {
  const result = getDb()
    .prepare("UPDATE users SET points = points - ? WHERE id = ? AND points >= ?")
    .run(points, userId, points);
  return result.changes === 1;
}

export function setOpenDay(userId: string, streak: number, day: string, pointsGain: number): boolean {
  const result = getDb()
    .prepare(
      `UPDATE users SET streak = ?, last_open_date = ?, points = points + ?
       WHERE id = ? AND (last_open_date IS NULL OR last_open_date != ?)`,
    )
    .run(streak, day, pointsGain, userId, day);
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

export function saveCourseDiscovery(userId: string, courses: { id: string; label: string }[]): void {
  const current = findUserById(userId);
  const ids = new Set(courses.map((course) => course.id));
  const kept = current?.courseChoice?.filter((id) => ids.has(id)) ?? null;
  const choice = courses.length >= 2 && kept && kept.length > 0 ? JSON.stringify(kept) : null;
  getDb()
    .prepare("UPDATE users SET course_options = ?, course_choice = ? WHERE id = ?")
    .run(courses.length > 0 ? JSON.stringify(courses) : null, choice, userId);
}

export function setCourseChoice(userId: string, ids: string[]): boolean {
  const current = findUserById(userId);
  if (!current || current.courseOptions.length < 2) return false;
  const known = new Set(current.courseOptions.map((course) => course.id));
  const picked = [...new Set(ids)].filter((id) => known.has(id));
  if (picked.length === 0) return false;
  getDb().prepare("UPDATE users SET course_choice = ? WHERE id = ?").run(JSON.stringify(picked), userId);
  return true;
}

export function tagTaskCourse(userId: string, externalId: string, courseKey: string): void {
  getDb()
    .prepare("UPDATE tasks SET course_key = ? WHERE user_id = ? AND external_id = ?")
    .run(courseKey, userId, externalId);
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
  const token = newToken();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  getDb()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(hashToken(token), userId, expires);
  return token;
}

export function userIdFromSession(token: string): string | null {
  const stored = hashToken(token);
  const row = getDb()
    .prepare("SELECT user_id, expires_at FROM sessions WHERE token = ?")
    .get(stored) as { user_id: string; expires_at: string } | undefined;
  if (!row) return null;
  if (row.expires_at < new Date().toISOString()) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(stored);
    return null;
  }
  return row.user_id;
}

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(hashToken(token));
}

export function insertTask(
  task: Omit<Task, "fileName" | "filePath" | "completedAt" | "onTime" | "status" | "courseKey"> & {
    status?: Task["status"];
    courseKey?: string | null;
  },
): void {
  const status = task.status ?? "pending";
  const completedAt = status === "done" ? task.createdAt : null;
  const onTime = status === "done" ? (task.dueAt >= task.createdAt ? 1 : 0) : null;
  getDb()
    .prepare(
      `INSERT INTO tasks (
        id, user_id, external_id, subject, title, description, due_at, status, source, educamos_url, needs_file, completed_at, on_time, created_at, tracked, course_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(user_id, external_id) DO UPDATE SET
        subject = excluded.subject,
        title = excluded.title,
        description = excluded.description,
        due_at = excluded.due_at,
        educamos_url = excluded.educamos_url,
        needs_file = excluded.needs_file,
        course_key = COALESCE(excluded.course_key, tasks.course_key),
        tracked = 1,
        status = CASE WHEN tasks.status = 'pending' THEN excluded.status ELSE tasks.status END,
        completed_at = CASE
          WHEN tasks.status = 'pending' AND excluded.status = 'done' THEN COALESCE(tasks.completed_at, excluded.created_at)
          ELSE tasks.completed_at
        END,
        on_time = CASE
          WHEN tasks.status = 'pending' AND excluded.status = 'done' THEN CASE WHEN excluded.due_at >= excluded.created_at THEN 1 ELSE 0 END
          ELSE tasks.on_time
        END
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
      status,
      task.source,
      task.educamosUrl,
      task.needsFile ? 1 : 0,
      completedAt,
      onTime,
      task.createdAt,
      task.courseKey ?? null,
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

export function addClaim(userId: string, kind: string, periodKey: string, points: number): boolean {
  const result = getDb()
    .prepare(
      `INSERT OR IGNORE INTO mission_claims (user_id, kind, period_key, xp, points, claimed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(userId, kind, periodKey, 0, points, new Date().toISOString());
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

export function listConversations(userId: string): ChatConversation[] {
  const rows = getDb()
    .prepare(
      "SELECT id, user_id, title, created_at, updated_at FROM chat_conversations WHERE user_id = ? ORDER BY updated_at DESC",
    )
    .all(userId) as {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
  }[];
  if (rows.length === 0) return [];
  const wrapped = userKey(userId);
  return withUserKey(userId, wrapped, (box) =>
    rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: isSealed(row.title) ? box.open(titleField(row.id), row.title) : row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  );
}

export function findConversation(userId: string, conversationId: string): ChatConversation | null {
  return listConversations(userId).find((conversation) => conversation.id === conversationId) ?? null;
}

export function createConversation(userId: string, title = "Nuevo chat"): ChatConversation {
  const now = new Date().toISOString();
  const conversation: ChatConversation = {
    id: crypto.randomUUID(),
    userId,
    title: title.trim().slice(0, 60) || "Nuevo chat",
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .prepare(
      "INSERT INTO chat_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(
      conversation.id,
      conversation.userId,
      withUserKey(userId, userKey(userId), (box) => box.seal(titleField(conversation.id), conversation.title)),
      conversation.createdAt,
      conversation.updatedAt,
    );
  return conversation;
}

export function renameConversation(userId: string, conversationId: string, title: string): void {
  const clean = title.trim().slice(0, 60) || "Nuevo chat";
  getDb()
    .prepare(
      "UPDATE chat_conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    )
    .run(
      withUserKey(userId, userKey(userId), (box) => box.seal(titleField(conversationId), clean)),
      new Date().toISOString(),
      conversationId,
      userId,
    );
}

export function touchConversation(userId: string, conversationId: string): void {
  getDb()
    .prepare("UPDATE chat_conversations SET updated_at = ? WHERE id = ? AND user_id = ?")
    .run(new Date().toISOString(), conversationId, userId);
}

export function listMessages(userId: string, conversationId?: string): ChatMessage[] {
  const query = conversationId
    ? "SELECT id, conversation_id, role, content, created_at FROM chat_messages WHERE user_id = ? AND conversation_id = ? ORDER BY created_at DESC LIMIT 80"
    : "SELECT id, conversation_id, role, content, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 80";
  const rows = getDb()
    .prepare(query)
    .all(...(conversationId ? [userId, conversationId] : [userId])) as {
    id: string;
    conversation_id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
  }[];
  if (rows.length === 0) return [];
  return withUserKey(userId, userKey(userId), (box) =>
    rows.reverse().map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: isSealed(row.content) ? box.open(messageField(row.id), row.content) : row.content,
      createdAt: row.created_at,
    })),
  );
}

export function addMessage(
  userId: string,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
): ChatMessage {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    conversationId,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
  getDb()
    .prepare(
      "INSERT INTO chat_messages (id, user_id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      message.id,
      userId,
      message.conversationId,
      message.role,
      withUserKey(userId, userKey(userId), (box) => box.seal(messageField(message.id), message.content)),
      message.createdAt,
    );
  touchConversation(userId, conversationId);
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
