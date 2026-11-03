-- =====================================================================
-- Personal Calendar - Supabase Database Schema
-- Run this script in your Supabase project's SQL Editor
-- =====================================================================

-- 1. Tags Table
create table if not exists public.planner_tags (
  id text primary key,
  name text not null,
  color text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Tasks Bank Table
create table if not exists public.planner_tasks (
  id text primary key,
  tag_id text references public.planner_tags(id) on delete set null,
  title text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. Planner Blocks Table (24 blocks per day, 7 days per week)
create table if not exists public.planner_blocks (
  week_key text not null,
  day_id text not null,
  block_index integer not null,
  title text default '' not null,
  status text default 'pending' not null,
  tag_id text default 'misc',
  notes text default '' not null,
  block_tasks jsonb default '{}'::jsonb not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  primary key (week_key, day_id, block_index)
);

-- 4. Planner Settings & Preferences Table
create table if not exists public.planner_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 5. Planner Routine Templates Table
create table if not exists public.planner_templates (
  id text primary key,
  name text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  total_blocks integer default 0 not null,
  tag_ids jsonb default '[]'::jsonb not null,
  blocks_data jsonb default '{}'::jsonb not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index if not exists idx_planner_tasks_tag_id on public.planner_tasks (tag_id);
create index if not exists idx_planner_blocks_week_key on public.planner_blocks (week_key);
create index if not exists idx_planner_blocks_week_day on public.planner_blocks (week_key, day_id);
create index if not exists idx_planner_blocks_tag_id on public.planner_blocks (tag_id);
create index if not exists idx_planner_templates_created_at on public.planner_templates (created_at desc);

-- Enable Row Level Security (RLS) on all exposed tables
alter table public.planner_tags enable row level security;
alter table public.planner_tasks enable row level security;
alter table public.planner_blocks enable row level security;
alter table public.planner_settings enable row level security;
alter table public.planner_templates enable row level security;

-- Grant permissions to public (anon) and authenticated roles
grant usage on schema public to anon, authenticated;
grant all on table public.planner_tags to anon, authenticated;
grant all on table public.planner_tasks to anon, authenticated;
grant all on table public.planner_blocks to anon, authenticated;
grant all on table public.planner_settings to anon, authenticated;
grant all on table public.planner_templates to anon, authenticated;

-- Policies for public calendar access
create policy "Allow all access to planner_tags"
  on public.planner_tags
  for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "Allow all access to planner_templates"
  on public.planner_templates
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Enable Supabase Realtime publication for immediate live updates across clients
alter publication supabase_realtime add table public.planner_tags;
alter publication supabase_realtime add table public.planner_tasks;
alter publication supabase_realtime add table public.planner_blocks;
alter publication supabase_realtime add table public.planner_settings;
alter publication supabase_realtime add table public.planner_templates;

create policy "Allow all access to planner_tasks"
  on public.planner_tasks
  for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "Allow all access to planner_blocks"
  on public.planner_blocks
  for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "Allow all access to planner_settings"
  on public.planner_settings
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Initial default tags seed data (Generic examples)
insert into public.planner_tags (id, name, color)
values
  ('misc',     'General',          '#64748b'),
  ('work',     'Work & Projects',  '#2563eb'),
  ('study',    'Study & Learning', '#059669'),
  ('fitness',  'Health & Fitness', '#d97706'),
  ('leisure',  'Rest & Leisure',   '#9333ea')
on conflict (id) do nothing;

-- Initial default tasks seed data (Generic examples)
insert into public.planner_tasks (id, tag_id, title)
values
  ('tsk-1', 'work',    'Plan daily priorities & review action items'),
  ('tsk-2', 'work',    'Deep focus on core task deliverables'),
  ('tsk-3', 'study',   'Read chapter / learn new concept'),
  ('tsk-4', 'study',   'Review notes & summarize key takeaways'),
  ('tsk-5', 'fitness', 'Light walk, stretch or workout'),
  ('tsk-6', 'misc',    'Clear inbox and organize workspace')
on conflict (id) do nothing;
