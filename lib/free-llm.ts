import { aiFetch } from "./ai-shield";

type Message = { role: "system" | "user" | "assistant"; content: string };
export type FreeLlmReply = { model: string; content: string; reasoning: string };

// Modelos de Kilo Gateway, que no piden cuenta ni clave. kilo-auto/free cambia
// de modelo en cada consulta, así que queda solo como respaldo.
const CHAT_MODELS = ["nvidia/nemotron-3-ultra-550b-a55b:free"];
const LIGHT_MODELS = CHAT_MODELS;
const BACKUP_MODEL = "kilo-auto/free";

function modelList(value: string | undefined, defaults: string[]): string[] {
  const picked = value
    ?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return picked?.length ? picked : defaults;
}

export function freeLlmModels(light = false): string[] {
  const main = light
    ? modelList(process.env.FREELLMAPI_LIGHT_MODEL, LIGHT_MODELS)
    : modelList(process.env.FREELLMAPI_MODEL, CHAT_MODELS);
  const backup = modelList(process.env.FREELLMAPI_BACKUP_MODEL, [BACKUP_MODEL]);
  return [...new Set([...main, ...backup])];
}

export function freeLlmConfigured(): boolean {
  return Boolean(process.env.FREELLMAPI_BASE_URL && process.env.FREELLMAPI_API_KEY);
}

export async function freeLlmReply(
  messages: Message[],
  options: { timeoutMs: number; light?: boolean },
): Promise<FreeLlmReply | null> {
  const base = process.env.FREELLMAPI_BASE_URL?.replace(/\/$/, "");
  const key = process.env.FREELLMAPI_API_KEY;
  if (!base || !key) return null;
  const deadline = Date.now() + options.timeoutMs;
  for (const model of freeLlmModels(options.light)) {
    const left = deadline - Date.now();
    if (left < 2000) break;
    try {
      const res = await aiFetch(`${base}/chat/completions`, {
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        timeoutMs: left,
        body: { model, messages },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        choices?: { message?: { content?: string | null; reasoning?: string | null } }[];
      };
      const message = data.choices?.[0]?.message;
      const content = message?.content?.trim() ?? "";
      const reasoning = message?.reasoning?.trim() ?? "";
      if (content || reasoning) return { model, content, reasoning };
    } catch {
      // Un modelo que tarda o se cae no corta la cadena: probamos el siguiente.
    }
  }
  return null;
}
