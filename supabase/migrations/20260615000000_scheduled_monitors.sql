-- Migration: 20260615000000_scheduled_monitors.sql
-- Creates scheduled monitors table for automated recurring accessibility audits (Pro & Agency tiers)

create table if not exists public.monitors (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete set null,
  url text not null,
  frequency text not null check (frequency in ('daily', 'weekly')),
  status text not null default 'active' check (status in ('active', 'paused')),
  alert_email text not null,
  alert_on_degradation boolean default true not null,
  min_score_threshold int default 90 not null check (min_score_threshold between 1 and 100),
  last_run_at timestamp with time zone,
  last_score int,
  last_scan_id uuid references public.scans(id) on delete set null,
  next_run_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.monitors enable row level security;

-- Select policy: User can view their own monitors or monitors belonging to their active team
create policy "Users can view own or team monitors" on public.monitors for select using (
  auth.uid() = user_id or (
    team_id is not null and exists (
      select 1 from public.team_members
      where team_members.team_id = monitors.team_id
        and team_members.user_id = auth.uid()
        and team_members.status = 'active'
    )
  )
);

-- Insert policy: User can insert own monitors
create policy "Users can insert own monitors" on public.monitors for insert with check (auth.uid() = user_id);

-- Update policy: User can update own monitors
create policy "Users can update own monitors" on public.monitors for update using (auth.uid() = user_id);

-- Delete policy: User can delete own monitors
create policy "Users can delete own monitors" on public.monitors for delete using (auth.uid() = user_id);

-- Service role bypass policy for cron processing
create policy "Service role has full access to monitors" on public.monitors for all using (true) with check (true);

-- Indexes for performance
create index if not exists idx_monitors_due on public.monitors (status, next_run_at) where status = 'active';
create index if not exists idx_monitors_user on public.monitors (user_id, created_at desc);
create index if not exists idx_monitors_team on public.monitors (team_id) where team_id is not null;
