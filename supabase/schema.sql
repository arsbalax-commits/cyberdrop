-- CYBERDROP cloud persistence for Supabase
-- Run this entire file in Supabase SQL Editor.
-- The browser uses only a publishable/anon key; RLS protects each user's rows.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  credits bigint not null default 2000,
  ref_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  ref_count integer not null default 0,
  ref_earned bigint not null default 0,
  used_ref boolean not null default false,
  last_ad timestamptz,
  last_income timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.builds (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cpu text,
  mb text,
  ram text,
  gpu text,
  ssd text,
  psu text,
  cool text,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists inventory_set_updated_at on public.inventory;
create trigger inventory_set_updated_at
before update on public.inventory
for each row execute function public.set_updated_at();

drop trigger if exists builds_set_updated_at on public.builds;
create trigger builds_set_updated_at
before update on public.builds
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  if uname is null then
    uname := split_part(coalesce(new.email, 'player'), '@', 1);
  end if;
  insert into public.profiles (id, username)
  values (new.id, left(uname, 32))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.inventory enable row level security;
alter table public.builds enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.inventory from anon;
revoke all on table public.builds from anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.inventory to authenticated;
grant select, insert, update, delete on public.builds to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "inventory_select_own" on public.inventory;
drop policy if exists "inventory_insert_own" on public.inventory;
drop policy if exists "inventory_update_own" on public.inventory;
drop policy if exists "inventory_delete_own" on public.inventory;
drop policy if exists "builds_select_own" on public.builds;
drop policy if exists "builds_insert_own" on public.builds;
drop policy if exists "builds_update_own" on public.builds;
drop policy if exists "builds_delete_own" on public.builds;

create policy "profiles_select_own"
on public.profiles for select
to authenticated using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "inventory_select_own"
on public.inventory for select
to authenticated using ((select auth.uid()) = user_id);

create policy "inventory_insert_own"
on public.inventory for insert
to authenticated with check ((select auth.uid()) = user_id);

create policy "inventory_update_own"
on public.inventory for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "inventory_delete_own"
on public.inventory for delete
to authenticated using ((select auth.uid()) = user_id);

create policy "builds_select_own"
on public.builds for select
to authenticated using ((select auth.uid()) = user_id);

create policy "builds_insert_own"
on public.builds for insert
to authenticated with check ((select auth.uid()) = user_id);

create policy "builds_update_own"
on public.builds for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "builds_delete_own"
on public.builds for delete
to authenticated using ((select auth.uid()) = user_id);
