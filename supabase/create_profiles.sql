-- Профили пользователей (username, full_name) для public.profiles.
-- Используется в src/shared/api/auth.ts (fetchCurrentUser).
-- Выполните в SQL Editor или: npm run db:apply-profiles

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username)
  where username is not null and length(trim(username)) > 0;

alter table public.profiles enable row level security;

drop policy if exists "Profiles: select own" on public.profiles;
create policy "Profiles: select own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Profiles: insert own" on public.profiles;
create policy "Profiles: insert own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: update own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), ''),
    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'name',
          ''
        )
      ),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profiles on auth.users;
create trigger on_auth_user_created_profiles
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user_profile();

insert into public.profiles (id, username, full_name)
select
  u.id,
  nullif(trim(coalesce(u.raw_user_meta_data->>'username', '')), ''),
  nullif(
    trim(
      coalesce(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        ''
      )
    ),
    ''
  )
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
