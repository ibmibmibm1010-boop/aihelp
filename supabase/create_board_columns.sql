-- Колонки канбана на доске + tasks.column_id. RLS через user_can_access_board.
-- Требуется: boards, tasks, функция user_can_access_board (fix_boards_rls).
-- Выполните в SQL Editor или: npm run db:apply-board-columns

create table if not exists public.board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  title text not null,
  color text not null,
  linked_status text not null check (linked_status in ('todo', 'doing', 'done')),
  section text not null default 'today' check (section in ('today', 'this_week', 'later')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists board_columns_board_section_sort_idx
  on public.board_columns (board_id, section, sort_order);

alter table public.board_columns enable row level security;

drop policy if exists "Board columns: select" on public.board_columns;
create policy "Board columns: select"
  on public.board_columns for select
  to authenticated
  using (public.user_can_access_board(board_id));

drop policy if exists "Board columns: insert" on public.board_columns;
create policy "Board columns: insert"
  on public.board_columns for insert
  to authenticated
  with check (public.user_can_access_board(board_id));

drop policy if exists "Board columns: update" on public.board_columns;
create policy "Board columns: update"
  on public.board_columns for update
  to authenticated
  using (public.user_can_access_board(board_id))
  with check (public.user_can_access_board(board_id));

drop policy if exists "Board columns: delete" on public.board_columns;
create policy "Board columns: delete"
  on public.board_columns for delete
  to authenticated
  using (public.user_can_access_board(board_id));

create or replace function public.seed_default_board_columns_for_new_board()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.board_columns (board_id, title, color, linked_status, sort_order, section)
  values
    (new.id, 'К выполнению', '#6366f1', 'todo', 0, 'today'),
    (new.id, 'В работе', '#f59e0b', 'doing', 0, 'this_week'),
    (new.id, 'Готово', '#22c55e', 'done', 0, 'later');
  return new;
end;
$$;

drop trigger if exists boards_seed_columns_after_insert on public.boards;
create trigger boards_seed_columns_after_insert
  after insert on public.boards
  for each row
  execute procedure public.seed_default_board_columns_for_new_board();

insert into public.board_columns (board_id, title, color, linked_status, sort_order, section)
select
  b.id,
  v.title,
  v.color,
  v.st,
  v.ord,
  v.sec
from public.boards b
cross join lateral (
  values
    ('К выполнению', '#6366f1', 'todo', 0, 'today'),
    ('В работе', '#f59e0b', 'doing', 0, 'this_week'),
    ('Готово', '#22c55e', 'done', 0, 'later')
) as v(title, color, st, ord, sec)
where not exists (
  select 1 from public.board_columns bc where bc.board_id = b.id
);

alter table public.tasks
  add column if not exists column_id uuid references public.board_columns (id) on delete set null;

create index if not exists tasks_column_id_idx on public.tasks (column_id);

update public.tasks t
set column_id = (
  select bc.id
  from public.board_columns bc
  where bc.board_id = t.board_id
    and bc.linked_status = t.status
  order by bc.sort_order asc, bc.created_at asc
  limit 1
)
where t.column_id is null;
