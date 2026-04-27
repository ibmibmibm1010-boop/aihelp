-- Секции колонок: today / this_week / later.
-- npm run db:apply-board-column-section

alter table public.board_columns
  add column if not exists section text default 'today';

update public.board_columns set section = 'today' where section is null;

alter table public.board_columns alter column section set not null;

alter table public.board_columns drop constraint if exists board_columns_section_check;
alter table public.board_columns add constraint board_columns_section_check
  check (section in ('today', 'this_week', 'later'));

drop index if exists board_columns_board_sort_idx;
create index if not exists board_columns_board_section_sort_idx
  on public.board_columns (board_id, section, sort_order);

with ranked as (
  select id,
    row_number() over (partition by board_id order by sort_order, created_at) - 1 as idx
  from public.board_columns
)
update public.board_columns bc
set
  section = case (r.idx % 3)
    when 0 then 'today'
    when 1 then 'this_week'
    else 'later'
  end,
  sort_order = (r.idx / 3)::int
from ranked r
where bc.id = r.id;

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
