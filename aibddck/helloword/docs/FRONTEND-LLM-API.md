# API вызова LLM (Venice) для фронтенда

Сервер: Cloudflare Worker `helloword`. **Ключ Venice (`VENICE_API_KEY`) не передаётся в браузер** — хранится только в секретах воркера. Фронт ходит на HTTP-эндпоинты воркера.

## Базовый URL

| Окружение   | URL (подставь свой `*.workers.dev` или custom domain) |
|------------|---------------------------------------------------------|
| Прод      | `https://helloword.ibmibmibm1010.workers.dev`        |
| Локальный воркер | `http://127.0.0.1:8787` (при `wrangler dev` + `.dev.vars` с `VENICE_API_KEY`) |

Переменная окружения **на воркере** (секрет / `.dev.vars`): имя — **`VENICE_API_KEY`**. На фронтенд ключ **не** прокидывать.

---

## `POST` `/llm-ping` — разбивка задачи на подзадачи

Только **POST** (GET не принимается, вернёт **405**). Модель `openai-gpt-4o-mini-2024-07-18` ([Venice API](https://venice.ai)). Системный промпт в `src/llm.ts` просит разнести **одну** крупную задачу (с фронта) на **мелкие подзадачи**. Ответ — JSON-массив вида `[{ "title", "task" }, ...]`.

С фронта: `POST` + JSON. CORS: `OPTIONS` (preflight), разрешён `POST`.

### Тело (JSON)

| Поле  | Тип     | Описание |
|-------|---------|----------|
| `task` | `string` | **Обязательно (не пусто):** формулировка задачи. |

**Пример:** `POST {BASE}/llm-ping`  
`Content-Type: application/json`  
`{ "task": "Собрать лендинг с формой заявки" }`

### Успех — `200`

```json
{
  "ok": true,
  "subtasks": [
    { "title": "краткое имя", "task": "описание, что сделать" }
  ]
}
```

TypeScript (DTO, слой `api` / `shared`):

```ts
export type SubtaskItem = { title: string; task: string };
export type LlmPingSuccess = { ok: true; subtasks: SubtaskItem[] };
```

### Метод не POST — `405`

- Например, GET на `/llm-ping`: `{ "ok": false, "error": "Используйте только POST с JSON { \"task\": \"…\" }" }`

### Пустой / неверный ввод — `400`

- Некорректный JSON, отсутствует или пустой `task`.

```json
{ "ok": false, "error": "…" }
```

### Нет ключа на воркере — `503`

```json
{
  "ok": false,
  "error": "Нет VENICE_API_KEY. ..."
}
```

```ts
export type LlmPingConfigError = {
  ok: false;
  error: string;
};
```

### Ошибка вызова Venice/сети — `502`

```json
{
  "ok": false,
  "error": "сообщение об ошибке"
}
```

```ts
export type LlmPingUpstreamError = {
  ok: false;
  error: string;
};
```

Объединение ответа:

```ts
export type LlmPingResponse = LlmPingSuccess | LlmPingConfigError | LlmPingUpstreamError;
```

### Пример `api`-слоя (POST, без ключа в клиенте)

```ts
// api/venice-llm.ts
const getBase = () => import.meta.env.VITE_HELLOWORD_BASE_URL;

export async function decomposeTask(task: string) {
  const res = await fetch(new URL('/llm-ping', getBase()).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task }),
  });
  const data = (await res.json()) as LlmPingResponse;
  if (!res.ok || !data.ok) {
    throw new Error('error' in data && data.error ? data.error : res.statusText);
  }
  return data.subtasks;
}
```

(Имена `VITE_*` — пример для Vite.)

### CORS

Для `GET/POST/OPTIONS` на `/llm-ping` воркер отдаёт `Access-Control-Allow-Origin: *` (для вызовов с фронта). Ужесточение (конкретный origin) — при необходимости на бэке.

---

## `GET /env-check` — диагностика (не для прод-логики)

| Поле | Тип | Смысл |
|------|-----|--------|
| `veniceKeyConfigured` | `boolean` | `true`, если `VENICE_API_KEY` на воркере непустой. |
| `bindingNames` | `string[]` | Имена биндингов (без значений секретов). Должно быть `VENICE_API_KEY` в списке, если секрет настроен. |

Использовать в UI только в dev/внутри админ-диагностики; в публичном проде **не** полагаться на эндпоинт.

---

## Безопасность

- **Не** вставляй API-ключ Venice в фронтенд, `localStorage` или публичные `env` репозитория.
- Маршрут `/llm-ping` **публичный** — при известном URL любой может тратить квоту. Для прод-продукта: авторизация, rate limit, снятие публичного `llm-ping` или защита токеном/сессией на воркере.

---

## Связанные файлы в репозитории

- Роут: `src/index.ts` — `case '/llm-ping'`
- Логика: `src/llm.ts` — `breakTaskIntoSubtasks`, `SUBTASK_DECOMPOSITION_SYSTEM_PROMPT`, `parseSubtaskItemsFromModelText`, `sendVeniceLlmRequest`
