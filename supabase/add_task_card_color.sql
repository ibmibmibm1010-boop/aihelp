-- Цвет карточки задачи (HEX, например #e0e7ff). Выполните в SQL Editor или: npm run db:apply-task-card-color

alter table public.tasks
  add column if not exists card_color text;

comment on column public.tasks.card_color is 'Optional HEX label color for the task card UI';
