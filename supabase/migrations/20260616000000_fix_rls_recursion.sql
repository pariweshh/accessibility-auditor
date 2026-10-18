-- ==============================================================================
-- Equivance: Fix Infinite RLS Recursion on Teams, Team Members, Scans, & Monitors
-- Execute this script directly in the Supabase Cloud SQL Editor:
-- https://supabase.com/dashboard/project/zwcitpiloonnzhallytf/sql/new
-- ==============================================================================

-- ── 1. Security Definer Helper Functions ─────────────────────────────────────
-- Using SECURITY DEFINER bypasses RLS during internal permission lookups,
-- preventing cyclic/infinite recursion between teams, team_members, and scans.

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
      and (_user_id = auth.uid() or coalesce(auth.role(), '') = 'service_role')
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
      and (_user_id = auth.uid() or coalesce(auth.role(), '') = 'service_role')
  );
$$;

-- ── 2. Teams RLS Policies (Recursion-Free) ───────────────────────────────────

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

-- ── 3. Team Members RLS Policies (Recursion-Free) ─────────────────────────────

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

-- ── 4. Scans RLS Policy (Recursion-Free) ──────────────────────────────────────

drop policy if exists "Users can view own scans" on public.scans;
drop policy if exists "Users can view own or team scans" on public.scans;
create policy "Users can view own or team scans" on public.scans
  for select using (
    user_id = auth.uid() or
    (team_id is not null and (public.is_team_member(team_id, auth.uid()) or public.is_team_owner(team_id, auth.uid())))
  );

-- ── 5. Monitors RLS Policy (Recursion-Free) ───────────────────────────────────

drop policy if exists "Users can view own or team monitors" on public.monitors;
create policy "Users can view own or team monitors" on public.monitors
  for select using (
    auth.uid() = user_id or
    (team_id is not null and (public.is_team_member(team_id, auth.uid()) or public.is_team_owner(team_id, auth.uid())))
  );
