-- Optional HEX color for task cards (UI)
alter table public.tasks
  add column if not exists card_color text;

comment on column public.tasks.card_color is 'Optional HEX label color for the task card UI';
