-- ==============================================================================
-- Equivance: Comprehensive Database & RLS Security Hardening Migration
-- Addresses:
--   1. [CRIT-01] Scope `monitors` bypass policy strictly to `service_role`
--   2. [CRIT-02] Scope `scans` update policy strictly to `service_role`
--   3. [CRIT-03] Protect `profiles` billing columns from client-side privilege escalation
--   4. [HIGH-10] Restrict `ai_fix_cache` inserts to `service_role`, prevent scan deletion quota reset,
--                and protect `teams.max_seats` / `teams.owner_id` from client tampering
--   5. [MED-07]  Ensure `scans` schema completeness (`violations`, `passes`, `score`, `result`),
--                include `is_team_owner` in `scans`, `monitors`, & `violations` RLS,
--                and harden `SECURITY DEFINER` functions (`search_path` & `auth.uid()` binding)
-- ==============================================================================

-- ── 1. Ensure Scans Schema Columns Exist ──────────────────────────────────────
alter table public.scans
  add column if not exists violations int default 0,
  add column if not exists passes int default 0,
  add column if not exists score int,
  add column if not exists result jsonb;

-- ── 2. Harden SECURITY DEFINER Helper Functions ───────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, subscription_tier)
  values (new.id, new.email, 'free');
  return new;
end;
$$;

-- Bind _user_id to auth.uid() when called by non-service_role clients to prevent cross-tenant enumeration
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

-- ── 3. Protect Profiles Billing Columns (CRIT-03) ─────────────────────────────
create or replace function public.protect_profile_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin', 'supabase_auth_admin') then
    if new.subscription_tier is distinct from old.subscription_tier
       or new.subscription_status is distinct from old.subscription_status
       or new.stripe_customer_id is distinct from old.stripe_customer_id
       or new.stripe_subscription_id is distinct from old.stripe_subscription_id then
      raise exception 'Direct modification of billing or subscription fields is forbidden';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_billing on public.profiles;
create trigger trg_protect_profile_billing
  before update on public.profiles
  for each row execute function public.protect_profile_billing_columns();

-- ── 4. Protect Teams Privileged Columns (HIGH-10) ─────────────────────────────
create or replace function public.protect_team_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    if new.max_seats is distinct from old.max_seats
       or new.owner_id is distinct from old.owner_id then
      raise exception 'Direct modification of team seat limits or ownership is forbidden';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_team_privileged on public.teams;
create trigger trg_protect_team_privileged
  before update on public.teams
  for each row execute function public.protect_team_privileged_columns();

-- ── 5. Lock Down Monitors RLS Policies (CRIT-01 & MED-07) ─────────────────────
drop policy if exists "Service role has full access to monitors" on public.monitors;
create policy "Service role has full access to monitors"
  on public.monitors for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Users can view own or team monitors" on public.monitors;
create policy "Users can view own or team monitors"
  on public.monitors for select
  using (
    auth.uid() = user_id or
    (
      team_id is not null and (
        public.is_team_member(team_id, auth.uid()) or
        public.is_team_owner(team_id, auth.uid())
      )
    )
  );

-- ── 6. Lock Down Scans RLS Policies (CRIT-02, HIGH-10, & MED-07) ──────────────
drop policy if exists "Service role can update scans" on public.scans;
create policy "Service role can update scans"
  on public.scans for update
  to service_role
  using (true)
  with check (true);

-- Prevent users from resetting monthly scan quota via direct client-side DELETE
drop policy if exists "Users can delete own scans" on public.scans;
create policy "Service role can delete scans"
  on public.scans for delete
  to service_role
  using (true);

drop policy if exists "Users can view own or team scans" on public.scans;
create policy "Users can view own or team scans"
  on public.scans for select
  using (
    user_id = auth.uid() or
    (
      team_id is not null and (
        public.is_team_member(team_id, auth.uid()) or
        public.is_team_owner(team_id, auth.uid())
      )
    )
  );

-- ── 7. Lock Down Violations RLS Policies (MED-07) ─────────────────────────────
drop policy if exists "Users can view violations of own scans" on public.violations;
create policy "Users can view violations of own scans"
  on public.violations for select
  using (
    exists (
      select 1 from public.scans
      where scans.id = violations.scan_id
        and (
          scans.user_id = auth.uid() or
          (
            scans.team_id is not null and (
              public.is_team_member(scans.team_id, auth.uid()) or
              public.is_team_owner(scans.team_id, auth.uid())
            )
          )
        )
    )
  );

-- ── 8. Lock Down AI Fix Cache RLS Policies (HIGH-10) ──────────────────────────
drop policy if exists "Allow authenticated users to insert cache" on public.ai_fix_cache;
drop policy if exists "Service role can insert cache" on public.ai_fix_cache;
create policy "Service role can insert cache"
  on public.ai_fix_cache for insert
  to service_role
  with check (true);
