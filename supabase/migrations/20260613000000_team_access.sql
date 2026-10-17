-- Phase 4: Team Access (3 Seats) for Agency Tier

-- 1. Create teams table
create table if not exists public.teams (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null unique,
  name text not null default 'Agency Team',
  max_seats int not null default 3,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create team_members table
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

-- 3. Add team_id to scans table
alter table public.scans
  add column if not exists team_id uuid references public.teams(id) on delete set null;

-- Enable RLS on teams and team_members
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

-- Teams RLS policies
drop policy if exists "Owners and members can view their team" on public.teams;
create policy "Owners and members can view their team" on public.teams
  for select using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.team_members
      where team_members.team_id = teams.id
        and team_members.user_id = auth.uid()
        and team_members.status = 'active'
    )
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

-- Team members RLS policies
drop policy if exists "Team owners and members can view member list" on public.team_members;
create policy "Team owners and members can view member list" on public.team_members
  for select using (
    exists (
      select 1 from public.teams
      where teams.id = team_members.team_id
        and (
          teams.owner_id = auth.uid() or
          exists (
            select 1 from public.team_members tm
            where tm.team_id = teams.id
              and tm.user_id = auth.uid()
              and tm.status = 'active'
          )
        )
    )
  );

drop policy if exists "Team owners can insert members" on public.team_members;
create policy "Team owners can insert members" on public.team_members
  for insert with check (
    exists (
      select 1 from public.teams
      where teams.id = team_members.team_id
        and teams.owner_id = auth.uid()
    )
  );

drop policy if exists "Team owners can update members" on public.team_members;
create policy "Team owners can update members" on public.team_members
  for update using (
    exists (
      select 1 from public.teams
      where teams.id = team_members.team_id
        and teams.owner_id = auth.uid()
    )
  );

drop policy if exists "Team owners or members themselves can delete membership" on public.team_members;
create policy "Team owners or members themselves can delete membership" on public.team_members
  for delete using (
    user_id = auth.uid() or
    exists (
      select 1 from public.teams
      where teams.id = team_members.team_id
        and teams.owner_id = auth.uid()
    )
  );

create index if not exists idx_scans_team_id on public.scans (team_id);
create index if not exists idx_team_members_user_id on public.team_members (user_id);
create index if not exists idx_team_members_invite_token on public.team_members (invite_token);

-- Update Scans RLS select policy to allow team visibility
drop policy if exists "Users can view own scans" on public.scans;
drop policy if exists "Users can view own or team scans" on public.scans;
create policy "Users can view own or team scans" on public.scans
  for select using (
    user_id = auth.uid() or
    (
      team_id is not null and
      exists (
        select 1 from public.team_members
        where team_members.team_id = scans.team_id
          and team_members.user_id = auth.uid()
          and team_members.status = 'active'
      )
    )
  );
