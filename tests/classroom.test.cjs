const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const originalCwd = process.cwd();
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "taskie-classroom-test-"));
process.chdir(temporary);
const realLoad = Module._load;
let currentUser = null;
const cookieValues = new Map();
let syncCalls = 0;
const jar = {
  get: (name) => cookieValues.has(name) ? { value: cookieValues.get(name).value } : undefined,
  set: (name, value, options) => cookieValues.set(name, { value, options }),
};
Module._load = function (request, parent, isMain) {
  if (request === "next/headers") return { cookies: async () => jar };
  if (request === "next/server") return {
    NextResponse: { redirect: (url) => new Response(null, { status: 307, headers: { location: String(url) } }) },
  };
  if (request === "@/lib/session") return { getCurrentUser: async () => currentUser };
  if (request === "@/lib/sync") return { syncUser: async () => { syncCalls++; return { ok: true }; } };
  if (request.startsWith("@/")) request = path.join(root, request.slice(2));
  return realLoad.call(this, request, parent, isMain);
};
require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } });
  module._compile(result.outputText, filename);
};
const db = require("../lib/db.ts");
const classroom = require("../lib/classroom.ts");
const begin = require("../app/api/auth/google/route.ts").GET;
const callback = require("../app/api/auth/google/callback/route.ts").GET;
const realFetch = global.fetch;
process.env.GOOGLE_CLIENT_ID = "test-client";
process.env.GOOGLE_CLIENT_SECRET = "test-secret";
process.env.GOOGLE_REDIRECT_URI = "http://127.0.0.1:43123/api/auth/google/callback";
const scopes = classroom.CLASSROOM_SCOPES.join(" ");

function createUser(id, legacy = false) {
  db.createUser({
    id, name: id, username: id, passwordHash: "unused-test-hash", educamosUrl: null,
    educamosLogin: legacy ? { username: "legacy@example.test", password: "legacy-password" } : null,
    timezone: "America/Argentina/Buenos_Aires", isDemo: false, platform: "classroom",
  });
  return db.findUserById(id);
}

test("authorization uses offline access, least-privilege scopes, state and PKCE", () => {
  const url = new URL(classroom.googleAuthorizationUrl("state", "challenge"));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("state"), "state");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("code_challenge"), "challenge");
  assert.equal(url.searchParams.get("scope"), scopes);
  const saved = process.env.GOOGLE_REDIRECT_URI;
  process.env.GOOGLE_REDIRECT_URI = "http://evil.example/api/auth/google/callback";
  assert.throws(() => classroom.googleConfig(), /GOOGLE_REDIRECT_URI/);
  process.env.GOOGLE_REDIRECT_URI = saved;
});

test("flow is bound to the user, expires, and can be consumed only once", () => {
  createUser("flow-owner");
  db.createGoogleFlow("flow-owner", "unique-state", "verifier");
  assert.equal(db.consumeGoogleFlow("another-user", "unique-state"), null);
  assert.equal(db.consumeGoogleFlow("flow-owner", "unique-state"), "verifier");
  assert.equal(db.consumeGoogleFlow("flow-owner", "unique-state"), null);
  db.createGoogleFlow("flow-owner", "expired", "old-verifier");
  global.rachaDb.prepare("UPDATE google_oauth_flows SET expires_at = 0").run();
  assert.equal(db.consumeGoogleFlow("flow-owner", "expired"), null);
});

test("OAuth callback rejects forged state before contacting Google", async () => {
  currentUser = createUser("forgery");
  cookieValues.set("taskie_google_state", { value: "expected" });
  let fetched = false;
  global.fetch = async () => { fetched = true; throw new Error("must not fetch"); };
  const response = await callback(new Request(process.env.GOOGLE_REDIRECT_URI + "?state=forged&code=bad"));
  assert.match(new URL(response.headers.get("location")).searchParams.get("googleError"), /no es válida/);
  assert.equal(fetched, false);
});

test("start and callback connect an existing account without retaining its Google password; replay fails", async () => {
  currentUser = createUser("existing", true);
  const start = await begin(new Request("http://127.0.0.1:43123/api/auth/google"));
  const authorize = new URL(start.headers.get("location"));
  const state = authorize.searchParams.get("state");
  assert.ok(state);
  assert.equal(jar.get("taskie_google_state").value, state);
  assert.equal(cookieValues.get("taskie_google_state").options.httpOnly, true);
  let exchanges = 0;
  global.fetch = async (url, init) => {
    assert.equal(url, "https://oauth2.googleapis.com/token");
    assert.equal(init.body.get("code"), "auth-code");
    assert.ok(init.body.get("code_verifier"));
    assert.equal(init.body.get("redirect_uri"), process.env.GOOGLE_REDIRECT_URI);
    exchanges++;
    return Response.json({ access_token: "access", refresh_token: "refresh", scope: scopes });
  };
  const requestUrl = process.env.GOOGLE_REDIRECT_URI + "?state=" + state + "&code=auth-code";
  const response = await callback(new Request(requestUrl));
  assert.equal(new URL(response.headers.get("location")).searchParams.get("googleConnected"), "1");
  const updated = db.findUserById(currentUser.id);
  assert.equal(db.openClassroomRefresh(updated), "refresh");
  assert.notEqual(updated.classroomRefreshEnc, "refresh");
  assert.equal(updated.educamosPasswordEnc, null);
  assert.equal(updated.educamosUsernameEnc, null);
  assert.equal(syncCalls, 1);
  // Even restoring the old browser cookie cannot replay a consumed server-side flow.
  cookieValues.set("taskie_google_state", { value: state });
  const replay = await callback(new Request(requestUrl));
  assert.match(new URL(replay.headers.get("location")).searchParams.get("googleError"), /ya se usó/);
  assert.equal(exchanges, 1);
});

test("cancelled consent, missing code and expired session do not exchange tokens", async () => {
  currentUser = createUser("cancelled");
  for (const suffix of ["&error=access_denied", ""]) {
    db.createGoogleFlow(currentUser.id, "cancel-state", "verifier");
    cookieValues.set("taskie_google_state", { value: "cancel-state" });
    global.fetch = async () => { throw new Error("Unexpected token exchange"); };
    const result = await callback(new Request(process.env.GOOGLE_REDIRECT_URI + "?state=cancel-state" + suffix));
    assert.ok(new URL(result.headers.get("location")).searchParams.get("googleError"));
  }
  currentUser = null;
  const result = await callback(new Request(process.env.GOOGLE_REDIRECT_URI + "?state=anything&code=secret"));
  assert.equal(new URL(result.headers.get("location")).pathname, "/entrar");
});

test("partial permissions and revoked tokens produce actionable errors without leaking tokens", async () => {
  global.fetch = async () => Response.json({ access_token: "secret-access", scope: classroom.CLASSROOM_SCOPES[0] });
  await assert.rejects(classroom.googleTokens({ grant_type: "authorization_code", code: "code" }), /Faltan permisos/);
  global.fetch = async () => Response.json({ error: "invalid_grant", error_description: "secret-refresh" }, { status: 400 });
  await assert.rejects(classroom.googleTokens({ grant_type: "refresh_token", refresh_token: "secret-refresh" }), /revocada/);
});

test("API paginates classes, coursework and submissions and reads only the current student's work", async () => {
  const calls = [];
  global.fetch = async (input, init) => {
    const url = new URL(input);
    calls.push(url);
    assert.equal(init.headers.authorization, "Bearer access");
    if (url.pathname === "/v1/courses") {
      assert.equal(url.searchParams.get("studentId"), "me");
      return Response.json(url.searchParams.has("pageToken")
        ? { courses: [{ id: "empty", name: "Empty" }] }
        : { courses: [{ id: "course", name: "Matemática" }], nextPageToken: "courses-page-2" });
    }
    if (url.pathname.includes("/empty/")) return Response.json({});
    if (url.pathname.endsWith("/studentSubmissions")) {
      assert.equal(url.searchParams.get("userId"), "me");
      return Response.json(url.searchParams.has("pageToken")
        ? { studentSubmissions: [{ courseWorkId: "second", state: "RECLAIMED_BY_STUDENT" }] }
        : { studentSubmissions: [{ courseWorkId: "first", state: "TURNED_IN" }], nextPageToken: "submissions-page-2" });
    }
    return Response.json(url.searchParams.has("pageToken")
      ? { courseWork: [{ id: "second", title: "Second" }] }
      : { courseWork: [{ id: "first", title: "First", description: "Instructions",
          dueDate: { year: 2026, month: 11, day: 19 }, dueTime: { minutes: 30 },
          alternateLink: "https://classroom.google.com/c/course/a/first" }], nextPageToken: "work-page-2" });
  };
  const result = await classroom.fetchClassroomTasks({ accessToken: "access", timeZone: "America/Argentina/Buenos_Aires" });
  assert.equal(result.ok, true);
  assert.equal(result.tasks.length, 2);
  assert.equal(result.tasks[0].status, "done");
  assert.equal(result.tasks[1].status, "pending");
  assert.equal(result.tasks[0].description, "Instructions");
  assert.equal(result.tasks[0].dueAt, "2026-11-19T00:30:00.000Z");
  assert.ok(calls.some((url) => url.searchParams.get("pageToken") === "courses-page-2"));
  assert.ok(calls.some((url) => url.searchParams.get("pageToken") === "work-page-2"));
  assert.ok(calls.some((url) => url.searchParams.get("pageToken") === "submissions-page-2"));
});

test("empty classes are successful and API denial is reported without partial success", async () => {
  global.fetch = async () => Response.json({});
  assert.deepEqual(await classroom.fetchClassroomTasks({ accessToken: "access", timeZone: "UTC" }),
    { ok: true, tasks: [], courses: [] });
  global.fetch = async () => Response.json({}, { status: 403 });
  const result = await classroom.fetchClassroomTasks({ accessToken: "access", timeZone: "UTC" });
  assert.equal(result.ok, false);
  assert.match(result.error, /API esté habilitada/);
});

after(() => {
  global.fetch = realFetch;
  Module._load = realLoad;
  global.rachaDb?.close();
  delete global.rachaDb;
  process.chdir(originalCwd);
  fs.rmSync(temporary, { recursive: true, force: true });
});
