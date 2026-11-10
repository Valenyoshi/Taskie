import { aiFetch } from "./ai-shield";

type Message = { role: "system" | "user" | "assistant"; content: string };
export type FreeLlmReply = { model: string; content: string; reasoning: string };

/**
 * Pollinations sirve GPT-OSS 20B sin cuenta ni clave, y responde en español
 * mejor que Nemotron. El respaldo es Dots en Kilo, que también devuelve texto.
 * Los modelos que solo llenan el razonamiento y dejan el mensaje vacío se saltean:
 * ese era el fallo de Nemotron y de kilo-auto.
 */
const POLLINATIONS = "https://text.pollinations.ai/openai";
const KILO = "https://api.kilo.ai/api/gateway/chat/completions";
const CHAT_MODEL = "openai-fast";
const BACKUP_MODEL = "dots-studio/dots-3-note-preview:free";

type Route = { url: string; model: string; key?: string };

function modelList(value: string | undefined, fallback: string): string[] {
  const picked = value
    ?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return picked?.length ? picked : [fallback];
}

function routes(light: boolean): Route[] {
  const base = process.env.FREELLMAPI_BASE_URL?.replace(/\/$/, "");
  const key = process.env.FREELLMAPI_API_KEY;
  if (base && key) {
    const models = modelList(
      light ? process.env.FREELLMAPI_LIGHT_MODEL : process.env.FREELLMAPI_MODEL,
      light ? CHAT_MODEL : CHAT_MODEL,
    );
    const backup = modelList(process.env.FREELLMAPI_BACKUP_MODEL, BACKUP_MODEL);
    return [...new Set([...models, ...backup])].map((model) => ({
      url: `${base}/chat/completions`,
      model,
      key,
    }));
  }
  const main = modelList(light ? process.env.FREELLMAPI_LIGHT_MODEL : process.env.FREELLMAPI_MODEL, CHAT_MODEL);
  const backup = modelList(process.env.FREELLMAPI_BACKUP_MODEL, BACKUP_MODEL);
  const list: Route[] = [];
  for (const model of main) list.push({ url: POLLINATIONS, model });
  for (const model of backup) {
    if (!list.some((route) => route.model === model)) list.push({ url: KILO, model });
  }
  return list;
}

export function freeLlmModels(light = false): string[] {
  return routes(light).map((route) => route.model);
}

export function freeLlmConfigured(): boolean {
  return routes(false).length > 0;
}

export async function freeLlmReply(
  messages: Message[],
  options: { timeoutMs: number; light?: boolean; perModelMs?: number },
): Promise<FreeLlmReply | null> {
  const deadline = Date.now() + options.timeoutMs;
  for (const route of routes(Boolean(options.light))) {
    const left = deadline - Date.now();
    if (left < 2000) break;
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (route.key) headers.authorization = `Bearer ${route.key}`;
      const res = await aiFetch(route.url, {
        headers,
        timeoutMs: Math.min(left, options.perModelMs ?? left),
        body: { model: route.model, messages },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        model?: string;
        choices?: { message?: { content?: string | null; reasoning?: string | null; reasoning_content?: string | null } }[];
      };
      const message = data.choices?.[0]?.message;
      const content = message?.content?.trim() ?? "";
      const reasoning = (message?.reasoning ?? message?.reasoning_content ?? "").trim();
      // Sin texto visible no hay respuesta: el razonamiento interno no se muestra.
      if (!content) continue;
      return { model: data.model || route.model, content, reasoning };
    } catch {
      // Un modelo que tarda o se cae no corta la cadena: probamos el siguiente.
    }
  }
  return null;
}
