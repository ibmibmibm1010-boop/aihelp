-- Привязка Telegram user id → аккаунт Supabase и целевая доска (задачи из бота летят на неё).
-- Нужны: boards, board_members/user_can_access_board (или fix_boards_rls).
-- Применение: SQL Editor или npm run db:apply-telegram-user-links

-- Проверка доступа к доске для произвольного пользователя (для Worker с service_role).
create or replace function public.user_can_access_board_for_user(p_auth_user_id uuid, p_board_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.boards b
    where b.id = p_board_id and b.user_id = p_auth_user_id
  )
  or exists (
    select 1 from public.board_members bm
    where bm.board_id = p_board_id and bm.user_id = p_auth_user_id
  );
$$;

revoke all on function public.user_can_access_board_for_user(uuid, uuid) from public;
grant execute on function public.user_can_access_board_for_user(uuid, uuid) to service_role;

create table if not exists public.telegram_user_links (
  telegram_user_id bigint primary key,
  supabase_user_id uuid not null references auth.users (id) on delete cascade,
  default_board_id uuid not null references public.boards (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint telegram_user_links_supabase_user_id_key unique (supabase_user_id)
);

create index if not exists telegram_user_links_supabase_user_id_idx
  on public.telegram_user_links (supabase_user_id);

create index if not exists telegram_user_links_default_board_id_idx
  on public.telegram_user_links (default_board_id);

alter table public.telegram_user_links enable row level security;

drop policy if exists "Telegram links: select own" on public.telegram_user_links;
create policy "Telegram links: select own"
  on public.telegram_user_links for select
  to authenticated
  using (supabase_user_id = auth.uid());

drop policy if exists "Telegram links: insert own" on public.telegram_user_links;
create policy "Telegram links: insert own"
  on public.telegram_user_links for insert
  to authenticated
  with check (supabase_user_id = auth.uid());

drop policy if exists "Telegram links: update own" on public.telegram_user_links;
create policy "Telegram links: update own"
  on public.telegram_user_links for update
  to authenticated
  using (supabase_user_id = auth.uid())
  with check (supabase_user_id = auth.uid());

drop policy if exists "Telegram links: delete own" on public.telegram_user_links;
create policy "Telegram links: delete own"
  on public.telegram_user_links for delete
  to authenticated
  using (supabase_user_id = auth.uid());
