-- Задачи на доске (связь boards → tasks). RLS через user_can_access_board.
-- Выполните после add_board_members / fix_boards_rls. Или: npm run db:apply-tasks

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  position int not null default 0,
  assignee_user_id uuid references auth.users (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_board_status_pos_idx
  on public.tasks (board_id, status, position);

alter table public.tasks enable row level security;

drop policy if exists "Tasks: select" on public.tasks;
create policy "Tasks: select"
  on public.tasks for select
  to authenticated
  using (public.user_can_access_board(board_id));

drop policy if exists "Tasks: insert" on public.tasks;
create policy "Tasks: insert"
  on public.tasks for insert
  to authenticated
  with check (
    public.user_can_access_board(board_id)
    and created_by = auth.uid()
  );

drop policy if exists "Tasks: update" on public.tasks;
create policy "Tasks: update"
  on public.tasks for update
  to authenticated
  using (public.user_can_access_board(board_id))
  with check (public.user_can_access_board(board_id));

drop policy if exists "Tasks: delete" on public.tasks;
create policy "Tasks: delete"
  on public.tasks for delete
  to authenticated
  using (public.user_can_access_board(board_id));
