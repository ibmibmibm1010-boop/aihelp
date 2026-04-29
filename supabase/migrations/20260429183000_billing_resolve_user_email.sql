-- Запасной путь для Stripe → billing_payments: если client_reference_id не дошёл (Payment Link / URL),
-- воркер вызывает эту функцию с email из Checkout. Только service_role (воркер с service key).
create or replace function public.billing_resolve_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public
stable
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(trim(coalesce(p_email, '')))
  limit 1;
$$;

revoke all on function public.billing_resolve_user_id_by_email(text) from public;
grant execute on function public.billing_resolve_user_id_by_email(text) to service_role;
