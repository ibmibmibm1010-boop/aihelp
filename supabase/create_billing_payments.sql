-- История оплат Stripe (запись из Cloudflare Worker по webhook).
-- RLS: пользователь видит только свои строки; вставка — только service_role (воркер).
-- Применение: npm run db:apply-billing-payments (нужен SUPABASE_ACCESS_TOKEN).
-- Запасной путь привязки платежа по email из Stripe Checkout: см. migrations/20260429183000_billing_resolve_user_email.sql

create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  stripe_event_id text unique,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_payments_user_created_idx
  on public.billing_payments (user_id, created_at desc);

alter table public.billing_payments enable row level security;

drop policy if exists "Billing payments: select own" on public.billing_payments;
create policy "Billing payments: select own"
  on public.billing_payments for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.billing_payments to authenticated;
