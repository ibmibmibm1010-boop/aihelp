import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { breakTaskIntoSubtasks } from './llm';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const corsTelegram: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Bot-Secret',
};

export function jsonTelegram(body: object, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsTelegram },
	});
}

function serviceSb(url: string, key: string): SupabaseClient {
	return createClient(url, key, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
}

async function getAuthUserId(
	supabaseUrl: string,
	serviceKey: string,
	accessToken: string
): Promise<string | null> {
	const base = supabaseUrl.replace(/\/$/, '');
	const r = await fetch(`${base}/auth/v1/user`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			apikey: serviceKey,
		},
	});
	if (!r.ok) return null;
	const u = (await r.json()) as { id?: string };
	return typeof u.id === 'string' ? u.id : null;
}

/** Привязка Telegram ↔ аккаунт (Bearer = JWT сессии Supabase). */
export async function handleTelegramLinkAccount(request: Request, env: Env): Promise<Response> {
	if (request.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: corsTelegram });
	}
	if (request.method !== 'POST') {
		return jsonTelegram({ ok: false, error: 'Используйте POST' }, 405);
	}

	const supabaseUrl = env.SUPABASE_URL?.trim();
	const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
	if (!supabaseUrl || !serviceKey) {
		return jsonTelegram({ ok: false, error: 'Supabase не настроен на воркере' }, 503);
	}

	const authHeader = request.headers.get('Authorization') ?? '';
	const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
	if (!m) {
		return jsonTelegram(
			{ ok: false, error: 'Нужен заголовок Authorization: Bearer <access_token Supabase>' },
			401
		);
	}
	const jwt = m[1];
	const userId = await getAuthUserId(supabaseUrl, serviceKey, jwt);
	if (!userId) {
		return jsonTelegram({ ok: false, error: 'Недействительная или истёкшая сессия' }, 401);
	}

	let body: { telegram_user_id?: unknown; default_board_id?: unknown };
	try {
		body = (await request.json()) as { telegram_user_id?: unknown; default_board_id?: unknown };
	} catch {
		return jsonTelegram({ ok: false, error: 'Некорректный JSON' }, 400);
	}

	const tgRaw = body.telegram_user_id;
	const tgId =
		typeof tgRaw === 'number' && Number.isFinite(tgRaw)
			? tgRaw
			: typeof tgRaw === 'string' && /^\d+$/.test(tgRaw.trim())
				? Number(tgRaw.trim())
				: NaN;
	const boardId =
		typeof body.default_board_id === 'string' ? body.default_board_id.trim() : '';

	if (!Number.isFinite(tgId) || tgId <= 0) {
		return jsonTelegram({ ok: false, error: 'Укажите telegram_user_id (положительное число)' }, 400);
	}
	if (!UUID_RE.test(boardId)) {
		return jsonTelegram({ ok: false, error: 'Укажите default_board_id (uuid доски)' }, 400);
	}

	const sb = serviceSb(supabaseUrl, serviceKey);

	const { data: allowed, error: rpcErr } = await sb.rpc('user_can_access_board_for_user', {
		p_auth_user_id: userId,
		p_board_id: boardId,
	});
	if (rpcErr) {
		const msg = rpcErr.message ?? String(rpcErr);
		return jsonTelegram(
			{ ok: false, error: `Проверка доски: ${msg}. Примените миграцию telegram_user_links.` },
			500
		);
	}
	if (allowed !== true) {
		return jsonTelegram({ ok: false, error: 'Нет доступа к выбранной доске' }, 403);
	}

	const { data: blocker } = await sb
		.from('telegram_user_links')
		.select('supabase_user_id')
		.eq('telegram_user_id', tgId)
		.maybeSingle();
	if (blocker && blocker.supabase_user_id !== userId) {
		return jsonTelegram(
			{ ok: false, error: 'Этот Telegram уже привязан к другому аккаунту' },
			409
		);
	}

	await sb.from('telegram_user_links').delete().eq('supabase_user_id', userId);

	const { error: insErr } = await sb.from('telegram_user_links').insert({
		telegram_user_id: tgId,
		supabase_user_id: userId,
		default_board_id: boardId,
	});

	if (insErr) {
		return jsonTelegram({ ok: false, error: insErr.message }, 500);
	}

	return jsonTelegram({ ok: true });
}

/** Разбиение текста LLM и вставка задач (секрет бота). */
export async function handleTelegramTasksIngest(request: Request, env: Env): Promise<Response> {
	if (request.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: corsTelegram });
	}
	if (request.method !== 'POST') {
		return jsonTelegram({ ok: false, error: 'Используйте POST' }, 405);
	}

	const expected = env.TELEGRAM_BOT_INGEST_SECRET?.trim();
	if (!expected) {
		return jsonTelegram(
			{
				ok: false,
				error:
					'На воркере не задан TELEGRAM_BOT_INGEST_SECRET (wrangler secret put TELEGRAM_BOT_INGEST_SECRET)',
			},
			503
		);
	}
	const got = request.headers.get('X-Telegram-Bot-Secret')?.trim();
	if (!got || got !== expected) {
		return jsonTelegram({ ok: false, error: 'Forbidden' }, 403);
	}

	const key = env.VENICE_API_KEY?.trim();
	if (!key) {
		return jsonTelegram(
			{
				ok: false,
				error:
					'Нет VENICE_API_KEY. Секрет: `npx wrangler secret put VENICE_API_KEY` в каталоге helloword',
			},
			503
		);
	}

	const supabaseUrl = env.SUPABASE_URL?.trim();
	const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
	if (!supabaseUrl || !serviceKey) {
		return jsonTelegram({ ok: false, error: 'Supabase не настроен на воркере' }, 503);
	}

	let body: { telegram_user_id?: unknown; text?: unknown };
	try {
		body = (await request.json()) as { telegram_user_id?: unknown; text?: unknown };
	} catch {
		return jsonTelegram({ ok: false, error: 'Некорректный JSON' }, 400);
	}

	const tgRaw = body.telegram_user_id;
	const tgId =
		typeof tgRaw === 'number' && Number.isFinite(tgRaw)
			? tgRaw
			: typeof tgRaw === 'string' && /^\d+$/.test(tgRaw.trim())
				? Number(tgRaw.trim())
				: NaN;

	const text = typeof body.text === 'string' ? body.text.trim() : '';

	if (!Number.isFinite(tgId) || tgId <= 0) {
		return jsonTelegram({ ok: false, error: 'Укажите telegram_user_id' }, 400);
	}
	if (!text) {
		return jsonTelegram({ ok: false, error: 'Укажите непустой text' }, 400);
	}

	const sb = serviceSb(supabaseUrl, serviceKey);

	const { data: link, error: linkErr } = await sb
		.from('telegram_user_links')
		.select('supabase_user_id, default_board_id')
		.eq('telegram_user_id', tgId)
		.maybeSingle();

	if (linkErr) {
		return jsonTelegram({ ok: false, error: linkErr.message }, 500);
	}
	if (!link) {
		return jsonTelegram(
			{
				ok: false,
				code: 'not_linked',
				error:
					'Telegram не привязан. Откройте приложение → Настройки → раздел Telegram и сохраните привязку.',
			},
			404
		);
	}

	const boardId = link.default_board_id as string;
	const createdBy = link.supabase_user_id as string;

	const { data: colRow, error: colErr } = await sb
		.from('board_columns')
		.select('id, linked_status')
		.eq('board_id', boardId)
		.eq('linked_status', 'todo')
		.order('sort_order', { ascending: true })
		.limit(1)
		.maybeSingle();

	if (colErr) {
		return jsonTelegram({ ok: false, error: colErr.message }, 500);
	}
	if (!colRow?.id) {
		return jsonTelegram(
			{
				ok: false,
				error:
					'На доске нет колонки со статусом «К выполнению» (linked_status=todo). Примените миграции board_columns.',
			},
			422
		);
	}

	const columnId = colRow.id as string;

	let subtasks;
	try {
		subtasks = await breakTaskIntoSubtasks(key, text);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return jsonTelegram({ ok: false, error: message }, 502);
	}

	const trimmed = subtasks
		.map((s) => ({
			title: (s.title ?? '').trim() || 'Без названия',
			description: (s.task ?? '').trim() === '' ? null : (s.task ?? '').trim(),
		}))
		.filter((x) => x.title.length > 0);

	if (trimmed.length === 0) {
		return jsonTelegram({ ok: false, error: 'Модель не вернула подзадач' }, 422);
	}

	const { data: posRows, error: posErr } = await sb
		.from('tasks')
		.select('position')
		.eq('board_id', boardId)
		.eq('column_id', columnId)
		.order('position', { ascending: false })
		.limit(1);

	if (posErr) {
		return jsonTelegram({ ok: false, error: posErr.message }, 500);
	}

	const base =
		posRows?.[0] && typeof (posRows[0] as { position: number }).position === 'number'
			? Number((posRows[0] as { position: number }).position)
			: -1;

	const rows = trimmed.map((item, i) => ({
		board_id: boardId,
		title: item.title,
		description: item.description,
		status: 'todo' as const,
		position: base + 1 + i,
		column_id: columnId,
		created_by: createdBy,
	}));

	const { data: inserted, error: insErr } = await sb.from('tasks').insert(rows).select('id, title');

	if (insErr) {
		return jsonTelegram({ ok: false, error: insErr.message }, 500);
	}

	const titles = (inserted ?? []).map((r) => (r as { title: string }).title);

	return jsonTelegram({
		ok: true,
		count: titles.length,
		titles,
	});
}
