import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const VENICE_BASE_URL = 'https://api.venice.ai/api/v1' as const;
const DEFAULT_VENICE_MODEL = 'openai-gpt-4o-mini-2024-07-18' as const;

/** Подзадача: короткое имя + описание. */
export type SubtaskItem = { title: string; task: string };

/**
 * Системный промпт: разбивка одной входной задачи на конкретные мелкие шаги.
 * Ответ модели — только JSON (массив объектов { title, task }).
 */
export const SUBTASK_DECOMPOSITION_SYSTEM_PROMPT = `Ты помощник по планированию. Пользователь передаёт одну крупную задачу: её нужно разбить на небольшие чёткие подзадачи, которые легко выполнять по очереди.

Правила:
- Каждая подзадача: короткое имя (title) и чёткое описание, что сделать (task).
- Подзадач должно столько, сколько нужно для логичного плана, без пустоты и дублирования.
- Пиши на том же языке, что и исходная формулировка задачи.

Формат ответа: верни ТОЛЬКО валидный JSON — один массив, без пояснений, без markdown-обёрток. Форма элементов: объекты с полями "title" и "task" (оба — строки).

Пример структуры (не копируй смыслы, а тип полей):
[{"title":"…","task":"…"}]`;

/**
 * Парсит JSON из ответа LLM: массив {title, task} или обёртку { subtasks: [...] }.
 */
export function parseSubtaskItemsFromModelText(text: string): SubtaskItem[] {
	let t = text.trim();
	const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
	if (fence) t = fence[1].trim();

	// { "subtasks": [...] }
	const obj = tryJson(t);
	if (obj && typeof obj === 'object' && !Array.isArray(obj) && 'subtasks' in obj) {
		const sub = (obj as { subtasks: unknown }).subtasks;
		if (Array.isArray(sub)) return validateSubtaskArray(sub);
	}
	if (Array.isArray(obj)) return validateSubtaskArray(obj);

	// срез от первой [ к последней ]
	const start = t.indexOf('[');
	const end = t.lastIndexOf(']');
	if (start !== -1 && end > start) {
		const inner = t.slice(start, end + 1);
		const arr = tryJson(inner);
		if (Array.isArray(arr)) return validateSubtaskArray(arr);
	}

	throw new Error('Model response is not a valid subtasks JSON array');
}

function tryJson(s: string): unknown {
	try {
		return JSON.parse(s);
	} catch {
		return null;
	}
}

function validateSubtaskArray(arr: unknown[]): SubtaskItem[] {
	const out: SubtaskItem[] = [];
	for (const item of arr) {
		if (!item || typeof item !== 'object') continue;
		const o = item as Record<string, unknown>;
		const title = o.title;
		const task = o.task;
		if (typeof title !== 'string' || typeof task !== 'string') continue;
		if (!title.trim() && !task.trim()) continue;
		out.push({ title: title.trim(), task: task.trim() });
	}
	if (out.length === 0) {
		throw new Error('No valid { title, task } items in model JSON');
	}
	return out;
}

export type SendVeniceLlmRequestOptions = {
	/** API-ключ Venice (секрет, не хранить в репозитории). */
	apiKey: string;
	/** Сообщения в формате OpenAI chat (system / user / assistant). */
	messages: ChatCompletionMessageParam[];
	/** По умолчанию `openai-gpt-4o-mini-2024-07-18`. */
	model?: string;
	/** Параметры `chat.completions.create` (температура, max_tokens и т.д.; без `stream`). */
	completionOptions?: Omit<
		OpenAI.Chat.Completions.ChatCompletionCreateParams,
		'messages' | 'model' | 'stream'
	>;
};

/**
 * Отправляет запрос к LLM через Venice (совместимый с OpenAI API).
 * Возвращает текст ответа ассистента.
 */
export async function sendVeniceLlmRequest(
	options: SendVeniceLlmRequestOptions
): Promise<string> {
	const { apiKey, messages, model = DEFAULT_VENICE_MODEL, completionOptions } = options;

	const client = new OpenAI({
		apiKey,
		baseURL: VENICE_BASE_URL,
	});

	const response = await client.chat.completions.create({
		...completionOptions,
		model,
		messages,
		stream: false,
	});

	const content = response.choices[0]?.message?.content;
	if (content == null || content === '') {
		throw new Error('LLM response has no text content');
	}

	return content;
}

/**
 * Разбивает входную задачу на подзадачи; ответ — массив { title, task }.
 */
export async function breakTaskIntoSubtasks(
	apiKey: string,
	taskFromFrontend: string,
	model?: string
): Promise<SubtaskItem[]> {
	const userContent = `Крупная задача (от пользователя/фронтенда):

${taskFromFrontend.trim()}

Верни только JSON-массив объектов с полями "title" и "task" по инструкции.`;

	const raw = await sendVeniceLlmRequest({
		apiKey,
		model: model ?? DEFAULT_VENICE_MODEL,
		messages: [
			{ role: 'system', content: SUBTASK_DECOMPOSITION_SYSTEM_PROMPT },
			{ role: 'user', content: userContent },
		],
		completionOptions: {
			temperature: 0.35,
		},
	});

	return parseSubtaskItemsFromModelText(raw);
}

/**
 * Вариант для одного пользовательского промпта.
 */
export async function askVeniceLlm(
	apiKey: string,
	userContent: string,
	model?: string
): Promise<string> {
	return sendVeniceLlmRequest({
		apiKey,
		messages: [{ role: 'user', content: userContent }],
		model,
	});
}

export const ASSISTANT_SYSTEM_PROMPT = `Ты встроенный ИИ-помощник приложения для канбан-досок и задач (AI Vibe Board).
Помогай с планированием, формулировкой задач, приоритами и мотивацией — коротко и по делу, без токсичности и морализаторства.
Не выдумывай содержимое досок пользователя: если нужен контекст, спроси. Отвечай на том же языке, что и последнее сообщение пользователя.`;

export type AssistantTurnMessage = { role: 'user' | 'assistant'; content: string };

/**
 * Один ход диалога: история user/assistant (последнее сообщение — от user), ответ ассистента текстом.
 */
export async function runAssistantTurn(
	apiKey: string,
	conversation: AssistantTurnMessage[],
	model?: string
): Promise<string> {
	const messages: ChatCompletionMessageParam[] = [
		{ role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
		...conversation.map(
			(m): ChatCompletionMessageParam => ({
				role: m.role,
				content: m.content,
			})
		),
	];

	return sendVeniceLlmRequest({
		apiKey,
		model,
		messages,
		completionOptions: {
			temperature: 0.55,
			max_tokens: 1024,
		},
	});
}
