# Биллинг Stripe + Supabase: чеклист

## 1. Два Cloudflare Worker (не путать)

| Команда / конфиг | Имя воркера | Назначение |
|------------------|-------------|------------|
| `npm run deploy:cf` → `wrangler.toml` в корне | **papka2** | SPA из `dist` (статика). **Нет** `/webhooks/stripe`. |
| `npm run deploy:cf:worker` → `aibddck/helloword/wrangler.jsonc` | **helloword** | Webhook Stripe `POST /webhooks/stripe`, LLM и т.д. |

В Stripe → **Developers → Webhooks** URL endpoint должен быть **helloword**, например:

`https://helloword.<account>.workers.dev/webhooks/stripe`

## 2. Секреты только у worker helloword

Из **корня репозитория**:

```bash
npx wrangler secret put STRIPE_WEBHOOK_SECRET --config aibddck/helloword/wrangler.jsonc
npx wrangler secret put SUPABASE_URL --config aibddck/helloword/wrangler.jsonc
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config aibddck/helloword/wrangler.jsonc
```

Опционально: `STRIPE_SECRET_KEY` (ключ API Stripe для экземпляра SDK).

`STRIPE_WEBHOOK_SECRET` = **Signing secret** (`whsec_...`) с **той же** страницы вебхука в Stripe, что и URL выше.

Проверка без значений:

`https://helloword.<account>.workers.dev/env-check`

Ожидание: `"billingWebhookReady": true` и три `billing*Configured`: true.

## 3. База Supabase

Тот же проект, что **`VITE_SUPABASE_URL`** у фронта. Таблица `public.billing_payments`:

```bash
npm run db:apply-billing-payments
```

Нужен `SUPABASE_ACCESS_TOKEN` в `.env` / `.env.local` (см. другие `db:apply-*`).

## 4. Фронт (история платежей)

- Страница `/billing` читает только Supabase (`billing_payments` + RLS).
- **Cloudflare Pages** (или сборка): задать `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, **`VITE_STRIPE_PAYMENT_LINK`** (Payment Link из Stripe).
- Оплата с `/billing` **под аккаунтом**, чтобы в ссылку попал `client_reference_id`.

## 5. После настройки

1. В Stripe нажать **Redeliver** на последнем `checkout.session.completed` или новый тестовый платёж.
2. Ответ воркера должен быть **200** (не 503 `Misconfigured`, не 400 подписи).
3. В приложении: **Обновить** на странице биллинга или вернуться на вкладку.

## 6. Типичные ошибки

- Секреты заведены для **papka2**, а вебхук бьёт в **helloword** (или наоборот).
- `SUPABASE_URL` воркера и `VITE_SUPABASE_URL` фронта — **разные проекты**.
- Платёж без `client_reference_id` (гость или не та ссылка) — строка в БД не привяжется к пользователю.

## 7. Тот же текст на странице `/billing` (пустая история)

Показывается в UI (ключ i18n `billing.paymentsEmptyHint`):

> Строка появится после события checkout.session.completed на воркере (POST …/webhooks/stripe).
>
> Проверьте: Stripe → Developers → Webhooks — endpoint = URL прод-helloword …/webhooks/stripe; Signing secret совпадает с STRIPE_WEBHOOK_SECRET в Cloudflare (wrangler secret).
>
> Оплату начинайте с этой страницы под аккаунтом (в ссылке будет client_reference_id). В настройках Payment Link разрешите передачу URL parameters / Client reference ID.
>
> Если нет таблицы: npm run db:apply-billing-payments. После возврата из Stripe — «Обновить».
>
> Привязка только по email из Checkout пока не реализована — это отдельная доработка.
