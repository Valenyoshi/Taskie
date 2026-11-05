import { aiFetch } from "./ai-shield";

type Message = { role: "system" | "user" | "assistant"; content: string };
export type FreeLlmReply = { model: string; content: string; reasoning: string };

// Gemini en FreeLLMAPI sale del plan gratis de Google AI Studio: cada modelo
// tiene su propia cuota diaria (unas 20 consultas), así que se prueban varios
// antes de pasar a Kilo, que no pide clave.
const CHAT_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash"];
const LIGHT_MODELS = ["gemini-3.5-flash-lite", "gemini-2.5-flash-lite"];
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
