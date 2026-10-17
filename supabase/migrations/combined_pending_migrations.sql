-- ==============================================================================
-- Equivance: Consolidated Pending Migrations (Team Access, Branding & Monitors)
-- Execute this script directly in the Supabase Cloud SQL Editor:
-- https://supabase.com/dashboard/project/zwcitpiloonnzhallytf/sql/new
-- ==============================================================================

-- ── 1. Create Tables First (Prevents Forward-Reference 42P01 Errors) ─────────

-- 1.1 Create teams table
create table if not exists public.teams (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null unique,
  name text not null default 'Agency Team',
  max_seats int not null default 3,
  brand_name text,
  brand_logo_url text,
  brand_primary_color text default '#4f46e5',
  brand_tagline text,
  brand_footer_text text,
  brand_hide_watermark boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1.2 Create team_members table
create table if not exists public.team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'pending' check (status in ('pending', 'active')),
  invite_token text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, email)
);

-- 1.3 Add team_id to scans table
alter table public.scans
  add column if not exists team_id uuid references public.teams(id) on delete set null;

-- 1.4 Create scheduled monitors table
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

-- ── 2. Enable Row Level Security (RLS) ────────────────────────────────────────

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.monitors enable row level security;

-- ── 3. Security Definer Helper Functions (Prevents Infinite RLS Recursion) ────

create or replace function public.is_team_member(_team_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = _team_id
      and user_id = _user_id
      and status = 'active'
  );
$$;

create or replace function public.is_team_owner(_team_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.teams
    where id = _team_id
      and owner_id = _user_id
  );
$$;

-- ── 4. Teams RLS Policies ─────────────────────────────────────────────────────

drop policy if exists "Owners and members can view their team" on public.teams;
create policy "Owners and members can view their team" on public.teams
  for select using (
    owner_id = auth.uid() or
    public.is_team_member(id, auth.uid())
  );

drop policy if exists "Agency owners can insert team" on public.teams;
create policy "Agency owners can insert team" on public.teams
  for insert with check (
    owner_id = auth.uid() and
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.subscription_tier = 'agency'
    )
  );

drop policy if exists "Owners can update own team" on public.teams;
create policy "Owners can update own team" on public.teams
  for update using (owner_id = auth.uid());

drop policy if exists "Owners can delete own team" on public.teams;
create policy "Owners can delete own team" on public.teams
  for delete using (owner_id = auth.uid());

-- ── 5. Team Members RLS Policies ──────────────────────────────────────────────

drop policy if exists "Team owners and members can view member list" on public.team_members;
create policy "Team owners and members can view member list" on public.team_members
  for select using (
    user_id = auth.uid() or
    public.is_team_owner(team_id, auth.uid()) or
    public.is_team_member(team_id, auth.uid())
  );

drop policy if exists "Team owners can insert members" on public.team_members;
create policy "Team owners can insert members" on public.team_members
  for insert with check (
    public.is_team_owner(team_id, auth.uid())
  );

drop policy if exists "Team owners can update members" on public.team_members;
create policy "Team owners can update members" on public.team_members
  for update using (
    public.is_team_owner(team_id, auth.uid())
  );

drop policy if exists "Team owners or members themselves can delete membership" on public.team_members;
create policy "Team owners or members themselves can delete membership" on public.team_members
  for delete using (
    user_id = auth.uid() or
    public.is_team_owner(team_id, auth.uid())
  );

-- ── 6. Scans RLS Policies & Indexes ───────────────────────────────────────────

drop policy if exists "Users can view own scans" on public.scans;
drop policy if exists "Users can view own or team scans" on public.scans;
create policy "Users can view own or team scans" on public.scans
  for select using (
    user_id = auth.uid() or
    (team_id is not null and public.is_team_member(team_id, auth.uid()))
  );

create index if not exists idx_scans_team_id on public.scans (team_id);
create index if not exists idx_team_members_user_id on public.team_members (user_id);
create index if not exists idx_team_members_invite_token on public.team_members (invite_token);

-- ── 7. Monitors RLS Policies & Indexes ────────────────────────────────────────

drop policy if exists "Users can view own or team monitors" on public.monitors;
create policy "Users can view own or team monitors" on public.monitors for select using (
  auth.uid() = user_id or
  (team_id is not null and public.is_team_member(team_id, auth.uid()))
);

drop policy if exists "Users can insert own monitors" on public.monitors;
create policy "Users can insert own monitors" on public.monitors for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own monitors" on public.monitors;
create policy "Users can update own monitors" on public.monitors for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own monitors" on public.monitors;
create policy "Users can delete own monitors" on public.monitors for delete using (auth.uid() = user_id);

drop policy if exists "Service role has full access to monitors" on public.monitors;
create policy "Service role has full access to monitors" on public.monitors for all using (true) with check (true);

create index if not exists idx_monitors_due on public.monitors (status, next_run_at) where status = 'active';
create index if not exists idx_monitors_user on public.monitors (user_id, created_at desc);
create index if not exists idx_monitors_team on public.monitors (team_id) where team_id is not null;

-- ── 8. Stripe Webhook Idempotency ─────────────────────────────────────────────

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.stripe_webhook_events enable row level security;

create index if not exists idx_stripe_webhook_events_processed_at on public.stripe_webhook_events (processed_at desc);

