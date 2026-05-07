-- Run this in your Supabase SQL editor (supabase.com → project → SQL Editor)

-- Profiles (one per user, auto-created on signup)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null default '',
  email text not null default ''
);

alter table profiles enable row level security;

create policy "Users can view all profiles" on profiles
  for select using (auth.role() = 'authenticated');

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Buckets
create table if not exists buckets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#e8a0a0',
  position int not null default 0,
  created_at timestamptz default now()
);

alter table buckets enable row level security;

create policy "Authenticated users can do everything with buckets" on buckets
  for all using (auth.role() = 'authenticated');

-- Tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  bucket_id uuid references buckets on delete cascade not null,
  title text not null,
  description text,
  due_date date,
  assigned_to uuid references auth.users on delete set null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  position int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table tasks enable row level security;

create policy "Authenticated users can do everything with tasks" on tasks
  for all using (auth.role() = 'authenticated');

-- Comments
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table comments enable row level security;

create policy "Authenticated users can do everything with comments" on comments
  for all using (auth.role() = 'authenticated');

-- Vendors
create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  contact_info text,
  notes text,
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  paid boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table vendors enable row level security;

create policy "Authenticated users can do everything with vendors" on vendors
  for all using (auth.role() = 'authenticated');

-- Budget (single row)
create table if not exists budget (
  id uuid primary key default gen_random_uuid(),
  total_amount numeric(10,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table budget enable row level security;

create policy "Authenticated users can do everything with budget" on budget
  for all using (auth.role() = 'authenticated');

-- Enable realtime for all tables
alter publication supabase_realtime add table buckets;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table vendors;
alter publication supabase_realtime add table budget;
