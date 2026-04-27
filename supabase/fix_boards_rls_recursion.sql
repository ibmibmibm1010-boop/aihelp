-- Исправление: infinite recursion между политиками boards и board_members.
-- Выполните в SQL Editor или: npm run db:fix-boards-rls

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

drop policy if exists "Boards: select own or member" on public.boards;
create policy "Boards: select own or member"
  on public.boards for select
  to authenticated
  using (public.user_can_access_board(id));
