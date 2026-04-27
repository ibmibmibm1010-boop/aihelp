export type SubtaskItem = { title: string; task: string };

export type LlmChatSuccess = { ok: true; reply: string };
export type LlmErrorBody = { ok: false; error: string };
export type LlmChatResponse = LlmChatSuccess | LlmErrorBody;

export type LlmPingSuccess = { ok: true; subtasks: SubtaskItem[] };
export type LlmPingResponse = LlmPingSuccess | LlmErrorBody;

/** Тело POST `/llm-ping`: JSON `{ "task": "…" }` (другое не принимается). */
export type LlmPingRequestBody = { task: string };

export type AssistantMessage = { role: "user" | "assistant"; content: string };

/** Прод-воркер (POST `/llm-ping`, `/llm-chat`); без слеша в конце. */
export const DEFAULT_HELLOWORD_BASE_URL = "https://helloword.ibmibmibm1010.workers.dev";

function getHelloWordBase(): string {
  const v = import.meta.env.VITE_HELLOWORD_BASE_URL?.trim();
  if (v) return v.replace(/\/+$/, "");
  return DEFAULT_HELLOWORD_BASE_URL;
}

export function getVeniceWorkerBaseUrl(): string {
  return getHelloWordBase();
}

function url(path: string): string {
  const base = getHelloWordBase();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readLlmJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    const hint =
      res.status === 500 || res.status === 502 || res.status === 503
        ? " Часто это значит, что wrangler dev не запущен (порт 8787) или процесс упал — смотрите терминал с npm run dev:worker."
        : "";
    throw new Error(
      `Пустой ответ от LLM-воркера (HTTP ${res.status}). Запустите в другом терминале: npm run dev:worker. Фронт: npm run dev; прокси /api/helloword → 127.0.0.1:8787.${hint}`,
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(
      `Ответ воркера не JSON (${res.status}): ${trimmed.slice(0, 160)}${trimmed.length > 160 ? "…" : ""}`,
    );
  }
}

/**
 * Разбивка одной задачи на подзадачи через Worker POST /llm-ping`.
 * В теле уходит ровно `{ "task": "<строка>" }`, `Content-Type: application/json`.
 */
export async function decomposeTask(task: string): Promise<SubtaskItem[]> {
  const body: LlmPingRequestBody = { task: task.trim() };
  const res = await fetch(url("/llm-ping"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await readLlmJson<LlmPingResponse>(res);
  if (!res.ok || !data.ok) {
    const err = "error" in data && typeof data.error === "string" ? data.error : res.statusText;
    throw new Error(err);
  }
  return data.subtasks;
}

/**
 * Сообщение ассистенту; история заканчивается репликой user.
 */
export async function sendAssistantMessage(messages: AssistantMessage[]): Promise<string> {
  const res = await fetch(url("/llm-chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = await readLlmJson<LlmChatResponse>(res);
  if (!res.ok || !data.ok) {
    const err = "error" in data && typeof data.error === "string" ? data.error : res.statusText;
    throw new Error(err);
  }
  return data.reply;
}
