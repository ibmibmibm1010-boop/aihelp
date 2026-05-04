import { breakTaskIntoSubtasks, runAssistantTurn, type AssistantTurnMessage } from './llm';
import { handleStripeWebhook } from './stripe-webhook';

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const corsLlm: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonLlm(
	body: object,
	status = 200
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsLlm },
	});
}

async function handleRequest(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		switch (url.pathname) {
			case '/webhooks/stripe':
				return handleStripeWebhook(request, env);
			case '/message':
				return new Response('Hello, World!');
			case '/random':
				return new Response(crypto.randomUUID());
			/**
			 * Разбивка задачи на подзадачи: только POST, JSON `{ "task": "…" }`.
			 * Ответ: `{ "ok": true, "subtasks": [{ "title", "task" }, …] }`.
			 */
			case '/llm-ping': {
				if (request.method === 'OPTIONS') {
					return new Response(null, { status: 204, headers: corsLlm });
				}
				if (request.method !== 'POST') {
					return jsonLlm(
						{ ok: false, error: 'Используйте только POST с JSON { "task": "…" }' },
						405
					);
				}
				const key = env.VENICE_API_KEY;
				if (!key) {
					return jsonLlm(
						{
							ok: false,
							error:
								'Нет VENICE_API_KEY. Секрет: `cd aibddck/helloword` → `npx wrangler secret put VENICE_API_KEY`',
						},
						503
					);
				}
				let taskText = '';
				try {
					const data = (await request.json()) as { task?: string };
					taskText = typeof data.task === 'string' ? data.task : '';
				} catch {
					return jsonLlm({ ok: false, error: 'Invalid JSON body' }, 400);
				}
				if (!taskText.trim()) {
					return jsonLlm(
						{
							ok: false,
							error: 'Передайте непустое поле task: { "task": "текст задачи" }',
						},
						400
					);
				}
				try {
					const subtasks = await breakTaskIntoSubtasks(key, taskText);
					return jsonLlm({ ok: true, subtasks });
				} catch (e) {
					const message = e instanceof Error ? e.message : String(e);
					return jsonLlm({ ok: false, error: message }, 502);
				}
			}
			/**
			 * Диалог с ИИ-помощником: POST, JSON `{ "messages": [{ "role": "user"|"assistant", "content": "…" }, …] }`.
			 * Последнее сообщение должно быть от user. Ответ: `{ "ok": true, "reply": "…" }`.
			 */
			case '/llm-chat': {
				if (request.method === 'OPTIONS') {
					return new Response(null, { status: 204, headers: corsLlm });
				}
				if (request.method !== 'POST') {
					return jsonLlm(
						{
							ok: false,
							error:
								'Используйте только POST с JSON { "messages": [{ "role": "user"|"assistant", "content": "…" }] }',
						},
						405
					);
				}
				const key = env.VENICE_API_KEY;
				if (!key) {
					return jsonLlm(
						{
							ok: false,
							error:
								'Нет VENICE_API_KEY. Секрет: `cd aibddck/helloword` → `npx wrangler secret put VENICE_API_KEY`',
						},
						503
					);
				}
				let rawMessages: unknown;
				try {
					const data = (await request.json()) as { messages?: unknown };
					rawMessages = data.messages;
				} catch {
					return jsonLlm({ ok: false, error: 'Invalid JSON body' }, 400);
				}
				if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
					return jsonLlm(
						{
							ok: false,
							error:
								'Передайте непустой массив messages: [{ "role": "user"|"assistant", "content": "…" }]',
						},
						400
					);
				}
				const sliced = rawMessages.slice(-24);
				const messages: AssistantTurnMessage[] = [];
				for (const item of sliced) {
					if (!item || typeof item !== 'object') continue;
					const o = item as Record<string, unknown>;
					const role = o.role;
					const content = o.content;
					if (role !== 'user' && role !== 'assistant') continue;
					if (typeof content !== 'string' || !content.trim()) continue;
					messages.push({ role, content: content.trim() });
				}
				if (messages.length === 0) {
					return jsonLlm(
						{
							ok: false,
							error: 'Нет валидных сообщений с полями role и content',
						},
						400
					);
				}
				if (messages[messages.length - 1].role !== 'user') {
					return jsonLlm(
						{
							ok: false,
							error: 'Последнее сообщение в messages должно быть от пользователя (role: "user")',
						},
						400
					);
				}
				try {
					const reply = await runAssistantTurn(key, messages);
					return jsonLlm({ ok: true, reply });
				} catch (e) {
					const message = e instanceof Error ? e.message : String(e);
					return jsonLlm({ ok: false, error: message }, 502);
				}
			}
			/** Проверка, что VENICE_API_KEY попал в воркер (значения секретов не раскрываются). */
			case '/env-check': {
				const e = env as unknown as Record<string, unknown>;
				const webhookOk = Boolean(
					env.STRIPE_WEBHOOK_SECRET?.trim()?.length &&
						env.SUPABASE_URL?.trim()?.length &&
						env.SUPABASE_SERVICE_ROLE_KEY?.trim()?.length,
				);
				return Response.json({
					veniceKeyConfigured: Boolean(env.VENICE_API_KEY?.length),
					billingWebhookReady: webhookOk,
					billingStripeWebhookSecretConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET?.trim()?.length),
					billingSupabaseUrlConfigured: Boolean(env.SUPABASE_URL?.trim()?.length),
					billingSupabaseServiceRoleConfigured: Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim()?.length),
					// должен появиться "VENICE_API_KEY"; если пусто — смотри `wrangler secret list`
					bindingNames: Object.keys(e).sort(),
				});
			}
			default:
				return new Response('Not Found', { status: 404 });
		}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		try {
			return await handleRequest(request, env, ctx);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return jsonLlm(
				{
					ok: false,
					error: `Внутренняя ошибка воркера: ${message}`,
				},
				500
			);
		}
	},
} satisfies ExportedHandler<Env>;
