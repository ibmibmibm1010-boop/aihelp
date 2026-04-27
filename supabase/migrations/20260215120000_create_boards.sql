-- Доски пользователя (RLS: только свои строки).
-- Применение: Supabase Dashboard → SQL → вставить supabase/create_boards.sql
--   или: supabase link && supabase db push (из корня репозитория).

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists boards_user_id_created_at_idx
  on public.boards (user_id, created_at desc);

alter table public.boards enable row level security;

drop policy if exists "Boards: select own" on public.boards;
create policy "Boards: select own"
  on public.boards for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Boards: insert own" on public.boards;
create policy "Boards: insert own"
  on public.boards for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Boards: update own" on public.boards;
create policy "Boards: update own"
  on public.boards for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Boards: delete own" on public.boards;
create policy "Boards: delete own"
  on public.boards for delete
  to authenticated
  using (auth.uid() = user_id);
