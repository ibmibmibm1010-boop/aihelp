-- Участники доски: владелец приглашает по email (пользователь должен быть зарегистрирован в Supabase Auth).
-- Политики через SECURITY DEFINER-функции — без рекурсии boards <-> board_members.
-- Выполните в SQL Editor после create_boards.sql (или npm run db:apply-board-members).

create table if not exists public.board_members (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  member_email text not null,
  role text not null default 'member' check (role in ('member', 'editor')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (board_id, user_id)
);

create index if not exists board_members_board_id_idx on public.board_members (board_id);
create index if not exists board_members_user_id_idx on public.board_members (user_id);

alter table public.board_members enable row level security;

-- Обход RLS внутри функций (definer), чтобы не было цикла политик
create or replace function public.user_can_access_board(p_board_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.boards b
    where b.id = p_board_id and b.user_id = auth.uid()
  )
  or exists (
    select 1 from public.board_members bm
    where bm.board_id = p_board_id and bm.user_id = auth.uid()
  );
$$;

create or replace function public.user_can_see_board_member_row(p_board_id uuid, p_member_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    p_member_user_id = auth.uid()
    or exists (select 1 from public.boards b where b.id = p_board_id and b.user_id = auth.uid())
    or exists (
      select 1 from public.board_members bm
      where bm.board_id = p_board_id and bm.user_id = auth.uid()
    );
$$;

create or replace function public.is_board_owner_for_board(p_board_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.boards b
    where b.id = p_board_id and b.user_id = auth.uid()
  );
$$;

revoke all on function public.user_can_access_board(uuid) from public;
grant execute on function public.user_can_access_board(uuid) to authenticated;

revoke all on function public.user_can_see_board_member_row(uuid, uuid) from public;
grant execute on function public.user_can_see_board_member_row(uuid, uuid) to authenticated;

revoke all on function public.is_board_owner_for_board(uuid) from public;
grant execute on function public.is_board_owner_for_board(uuid) to authenticated;

drop policy if exists "Board members: select" on public.board_members;
create policy "Board members: select"
  on public.board_members for select
  to authenticated
  using (public.user_can_see_board_member_row(board_id, user_id));

drop policy if exists "Board members: delete owner or self" on public.board_members;
create policy "Board members: delete owner or self"
  on public.board_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_board_owner_for_board(board_id)
  );

drop policy if exists "Boards: select own" on public.boards;
drop policy if exists "Boards: select own or member" on public.boards;
create policy "Boards: select own or member"
  on public.boards for select
  to authenticated
  using (public.user_can_access_board(id));

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

create or replace function public.add_board_member_by_email(p_board_id uuid, p_email text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_member uuid;
  v_email text;
begin
  v_email := lower(trim(p_email));
  if v_email = '' then
    return json_build_object('ok', false, 'error', 'empty_email');
  end if;

  select b.user_id into v_owner from public.boards b where b.id = p_board_id;
  if v_owner is null then
    return json_build_object('ok', false, 'error', 'board_not_found');
  end if;
  if v_owner <> auth.uid() then
    return json_build_object('ok', false, 'error', 'not_owner');
  end if;

  select u.id into v_member from auth.users u where lower(u.email::text) = v_email limit 1;
  if v_member is null then
    return json_build_object('ok', false, 'error', 'user_not_found');
  end if;
  if v_member = v_owner then
    return json_build_object('ok', false, 'error', 'already_owner');
  end if;

  if exists (
    select 1 from public.board_members bm
    where bm.board_id = p_board_id and bm.user_id = v_member
  ) then
    return json_build_object('ok', false, 'error', 'already_member');
  end if;

  insert into public.board_members (board_id, user_id, member_email, invited_by)
  values (p_board_id, v_member, v_email, auth.uid());

  return json_build_object('ok', true, 'user_id', v_member);
end;
$$;

grant execute on function public.add_board_member_by_email(uuid, text) to authenticated;
