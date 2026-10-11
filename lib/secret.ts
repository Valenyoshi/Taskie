import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import path from "path";

const PREFIX = "tk2";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const PAD_BLOCK = 64;
const HKDF_SALT = Buffer.from("taskie-vault-v2", "utf8");

const globalForVault = globalThis as unknown as { taskieMasterKey?: Buffer };

export function dataDir(): string {
  const dir = path.join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

export function lockDown(file: string, mode = 0o600): void {
  try {
    if (existsSync(file)) chmodSync(file, mode);
  } catch {
    // Algunos sistemas de archivos no aceptan permisos POSIX.
  }
}

function keyFromEnv(): Buffer | null {
  const raw = process.env.TASKIE_MASTER_KEY?.trim();
  if (!raw) return null;
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error("TASKIE_MASTER_KEY tiene que tener 32 bytes (64 caracteres hex o base64).");
  }
  return key;
}

function keyFromFile(): Buffer {
  const file = path.join(dataDir(), "master.key");
  if (!existsSync(file)) {
    try {
      writeFileSync(file, randomBytes(KEY_BYTES), { mode: 0o600, flag: "wx" });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  lockDown(file);
  const key = readFileSync(file);
  if (key.length !== KEY_BYTES) throw new Error("La clave maestra de Taskie no tiene el tamaño esperado.");
  return key;
}

function masterKey(): Buffer {
  if (!globalForVault.taskieMasterKey) {
    globalForVault.taskieMasterKey = keyFromEnv() ?? keyFromFile();
  }
  return globalForVault.taskieMasterKey;
}

function derive(secret: Buffer, salt: Buffer, info: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secret, salt, Buffer.from(info, "utf8"), KEY_BYTES));
}

function b64(buf: Buffer): string {
  return buf.toString("base64url");
}

function pad(plain: string): Buffer {
  const body = Buffer.from(plain, "utf8");
  if (body.length > 0xffff) throw new Error("El dato es demasiado grande para cifrarlo.");
  const size = Math.ceil((body.length + 2) / PAD_BLOCK) * PAD_BLOCK;
  const out = randomBytes(size);
  out.writeUInt16BE(body.length, 0);
  body.copy(out, 2);
  body.fill(0);
  return out;
}

function unpad(buf: Buffer): string {
  const length = buf.readUInt16BE(0);
  if (length > buf.length - 2) throw new Error("El dato cifrado está dañado.");
  return buf.subarray(2, 2 + length).toString("utf8");
}

function seal(key: Buffer, aad: string, plain: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  return [PREFIX, b64(iv), b64(cipher.getAuthTag()), b64(enc)].join(".");
}

function open(key: Buffer, aad: string, payload: string): Buffer {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX) throw new Error("Formato de dato cifrado desconocido.");
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new Error("El dato cifrado está dañado.");
  const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_BYTES });
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(parts[3], "base64url")), decipher.final()]);
}

export function isSealed(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${PREFIX}.`) && value.split(".").length === 4;
}

function wrappingKey(userId: string): Buffer {
  return derive(masterKey(), HKDF_SALT, `taskie/kek/v2|${userId}`);
}

export function createDataKey(userId: string): string {
  const dek = randomBytes(KEY_BYTES);
  const kek = wrappingKey(userId);
  try {
    return seal(kek, `${PREFIX}|dek|${userId}`, dek);
  } finally {
    dek.fill(0);
    kek.fill(0);
  }
}

function unwrapDataKey(userId: string, wrapped: string): Buffer {
  const kek = wrappingKey(userId);
  try {
    const dek = open(kek, `${PREFIX}|dek|${userId}`, wrapped);
    if (dek.length !== KEY_BYTES) throw new Error("La clave del usuario está dañada.");
    return dek;
  } finally {
    kek.fill(0);
  }
}

/** Abre la clave de un usuario una sola vez y cifra o descifra varios campos con ella. */
export function withUserKey<T>(
  userId: string,
  wrapped: string,
  fn: (box: { seal(field: string, plain: string): string; open(field: string, payload: string): string }) => T,
): T {
  const dek = unwrapDataKey(userId, wrapped);
  const fieldKey = (field: string) => derive(dek, Buffer.from(userId, "utf8"), `taskie/field/v2|${field}`);
  const aad = (field: string) => `${PREFIX}|${userId}|${field}`;
  try {
    return fn({
      seal(field, plain) {
        const key = fieldKey(field);
        const body = pad(plain);
        try {
          return seal(key, aad(field), body);
        } finally {
          key.fill(0);
          body.fill(0);
        }
      },
      open(field, payload) {
        const key = fieldKey(field);
        let body: Buffer | null = null;
        try {
          body = open(key, aad(field), payload);
          return unpad(body);
        } finally {
          key.fill(0);
          body?.fill(0);
        }
      },
    });
  } finally {
    dek.fill(0);
  }
}

export function normalizeLogin(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("es");
}

/** Huella HMAC para buscar un usuario de Educamos sin guardarlo legible. */
export function blindIndex(kind: string, value: string): string {
  const key = derive(masterKey(), HKDF_SALT, `taskie/index/v2|${kind}`);
  try {
    return createHmac("sha256", key).update(normalizeLogin(value), "utf8").digest("hex");
  } finally {
    key.fill(0);
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Compara en tiempo constante, sin filtrar el largo de ninguno de los dos valores. */
export function safeEqual(left: string, right: string): boolean {
  const key = randomBytes(KEY_BYTES);
  const a = createHmac("sha256", key).update(left, "utf8").digest();
  const b = createHmac("sha256", key).update(right, "utf8").digest();
  return timingSafeEqual(a, b);
}

const LEGACY_FILE = () => path.join(dataDir(), "secret.key");

export function hasLegacyKey(): boolean {
  return existsSync(LEGACY_FILE());
}

/** Solo para migrar contraseñas guardadas con el formato anterior (una clave para todos). */
export function openLegacy(payload: string): string {
  const key = readFileSync(LEGACY_FILE());
  const buf = Buffer.from(payload, "base64");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, buf.subarray(0, IV_BYTES));
    decipher.setAuthTag(buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([decipher.update(buf.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
  } finally {
    key.fill(0);
  }
}

export function destroyLegacyKey(): void {
  const file = LEGACY_FILE();
  if (!existsSync(file)) return;
  writeFileSync(file, randomBytes(KEY_BYTES));
  unlinkSync(file);
}
