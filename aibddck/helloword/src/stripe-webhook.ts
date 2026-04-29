import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createServiceSupabase(url: string, serviceKey: string): SupabaseClient {
	return createClient(url, serviceKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
}

/** Ключ API нужен конструктору SDK; не используется для вызовов Stripe API, только для `constructEventAsync`. */
function getStripeSdk(env: Env): Stripe {
	const key =
		typeof env.STRIPE_SECRET_KEY === 'string' && env.STRIPE_SECRET_KEY.trim().length > 0
			? env.STRIPE_SECRET_KEY.trim()
			: 'sk_test_webhook_sdk_stub_not_for_api_calls________________';
	return new Stripe(key, { apiVersion: '2026-04-22.dahlia', typescript: true });
}

function normalizePaymentStatus(
	stripeStatus: string | null | undefined,
): 'succeeded' | 'pending' | 'failed' {
	if (stripeStatus === 'paid' || stripeStatus === 'no_payment_required') return 'succeeded';
	if (stripeStatus === 'unpaid') return 'pending';
	return 'failed';
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
	const pi = session.payment_intent;
	if (typeof pi === 'string') return pi;
	if (pi && typeof pi === 'object' && 'id' in pi && typeof pi.id === 'string') {
		return pi.id;
	}
	return null;
}

async function insertPayment(
	supabase: SupabaseClient,
	row: {
		user_id: string;
		stripe_checkout_session_id: string;
		stripe_payment_intent_id: string | null;
		stripe_event_id: string;
		amount_cents: number;
		currency: string;
		status: 'succeeded' | 'pending' | 'failed';
		metadata: Record<string, unknown>;
	},
): Promise<void> {
	const { error } = await supabase.from('billing_payments').insert(row);

	if (!error) return;

	if (error.code === '23505') {
		return;
	}
	if (error.code === '23503') {
		console.info('billing_payments: FK (user missing), skip');
		return;
	}
	console.error(
		'billing_payments insert:',
		JSON.stringify({
			code: error.code,
			message: error.message,
			hint: error.hint,
			details: error.details,
		}),
	);
}

async function retrieveCheckoutSession(env: Env, sessionId: string): Promise<Stripe.Checkout.Session | null> {
	const key =
		typeof env.STRIPE_SECRET_KEY === 'string' && env.STRIPE_SECRET_KEY.trim().length > 0
			? env.STRIPE_SECRET_KEY.trim()
			: null;
	if (!key) return null;
	try {
		const stripe = new Stripe(key, { apiVersion: '2026-04-22.dahlia', typescript: true });
		return await stripe.checkout.sessions.retrieve(sessionId);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.warn('Stripe checkout.sessions.retrieve:', msg);
		return null;
	}
}

/**
 * Основная привязка — UUID в client_reference_id (со страницы Billing).
 * Если Stripe его не передал или отбросил (неверный параметр Payment Link — см. Stripe Dashboard URL parameters),
 * пробуем email из Checkout и RPC billing_resolve_user_id_by_email (миграция в Supabase).
 */
async function resolveUserId(session: Stripe.Checkout.Session, supabase: SupabaseClient): Promise<string | null> {
	const ref = session.client_reference_id?.trim();
	if (ref && UUID_RE.test(ref)) return ref;

	const emailRaw =
		session.customer_details?.email?.trim() || session.customer_email?.trim();
	if (!emailRaw) return null;

	const { data, error } = await supabase.rpc('billing_resolve_user_id_by_email', {
		p_email: emailRaw,
	});

	if (error) {
		if (
			error.code === 'PGRST202' ||
			error.code === '42883' ||
			error.message.includes('billing_resolve_user_id_by_email')
		) {
			console.warn(
				'billing_resolve_user_id_by_email: отсутствует в БД — примените миграцию supabase/migrations/20260429183000_billing_resolve_user_email.sql',
			);
		} else {
			console.warn('billing_resolve_user_id_by_email:', error.code, error.message);
		}
		return null;
	}

	if (typeof data === 'string' && UUID_RE.test(data)) return data;

	return null;
}

async function handleCheckoutSessionCompleted(
	eventId: string,
	sessionInput: Stripe.Checkout.Session,
	supabase: SupabaseClient,
	env: Env,
): Promise<void> {
	const sessionId = sessionInput.id;
	if (!sessionId) {
		console.warn('Stripe: пустой session.id');
		return;
	}

	let session = sessionInput;
	if (!session.client_reference_id?.trim() || !UUID_RE.test(session.client_reference_id.trim())) {
		const full = await retrieveCheckoutSession(env, sessionId);
		if (full) session = full;
	}

	const userId = await resolveUserId(session, supabase);
	if (!userId) {
		console.info(
			'checkout.session.completed: нет user_id (client_reference_id и email→user); пропуск. Проверьте Payment Link (URL parameters → client_reference_id) и email в Supabase.',
		);
		return;
	}

	const amountCents = typeof session.amount_total === 'number' ? session.amount_total : 0;
	const currency = (session.currency || 'usd').toLowerCase();
	const status = normalizePaymentStatus(session.payment_status);

	const refRaw = session.client_reference_id?.trim();
	const resolvedBy =
		refRaw && UUID_RE.test(refRaw) ? 'client_reference_id' : 'email_lookup';

	await insertPayment(supabase, {
		user_id: userId,
		stripe_checkout_session_id: sessionId,
		stripe_payment_intent_id: paymentIntentId(session),
		stripe_event_id: eventId,
		amount_cents: amountCents,
		currency,
		status,
		metadata: {
			payment_status: session.payment_status,
			mode: session.mode,
			resolved_by: resolvedBy,
			stripe_client_reference_id: refRaw ?? null,
			checkout_email:
				session.customer_details?.email?.trim() || session.customer_email?.trim() || null,
		},
	});
}

export async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
	if (request.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 });
	}

	const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim();
	const supabaseUrl = env.SUPABASE_URL?.trim();
	const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

	if (!webhookSecret || !supabaseUrl || !serviceKey) {
		console.error('Stripe webhook: нет STRIPE_WEBHOOK_SECRET / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
		return Response.json({ error: 'Misconfigured' }, { status: 503 });
	}

	const sig = request.headers.get('stripe-signature');
	if (!sig) {
		return Response.json({ error: 'Missing stripe-signature' }, { status: 400 });
	}

	let rawBody: string;
	try {
		rawBody = await request.text();
	} catch {
		return Response.json({ error: 'Invalid body' }, { status: 400 });
	}

	let event: Stripe.Event;
	try {
		const stripe = getStripeSdk(env);
		event = (await stripe.webhooks.constructEventAsync(
			rawBody,
			sig,
			webhookSecret,
		)) as Stripe.Event;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.warn('Stripe verify:', msg);
		return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 });
	}

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object as Stripe.Checkout.Session;
		const supabase = createServiceSupabase(supabaseUrl, serviceKey);
		await handleCheckoutSessionCompleted(event.id, session, supabase, env);
	}

	return Response.json({ received: true });
}
