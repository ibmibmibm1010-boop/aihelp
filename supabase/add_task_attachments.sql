-- Вложения-изображения к задачам: массив публичных URL (Supabase Storage).
-- Bucket + RLS. Выполните в SQL Editor или: npm run db:apply-task-attachments

alter table public.tasks
  add column if not exists attachment_urls text[] not null default '{}'::text[];

comment on column public.tasks.attachment_urls is 'Public URLs of images attached to the task (storage task-attachments)';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-attachments',
  'task-attachments',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "task_attachments_select_public" on storage.objects;
create policy "task_attachments_select_public"
  on storage.objects for select
  using (bucket_id = 'task-attachments');

drop policy if exists "task_attachments_insert_board" on storage.objects;
create policy "task_attachments_insert_board"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'task-attachments'
    and public.user_can_access_board((split_part(name, '/', 1))::uuid)
  );

drop policy if exists "task_attachments_update_board" on storage.objects;
create policy "task_attachments_update_board"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and public.user_can_access_board((split_part(name, '/', 1))::uuid)
  )
  with check (
    bucket_id = 'task-attachments'
    and public.user_can_access_board((split_part(name, '/', 1))::uuid)
  );

drop policy if exists "task_attachments_delete_board" on storage.objects;
create policy "task_attachments_delete_board"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and public.user_can_access_board((split_part(name, '/', 1))::uuid)
  );
