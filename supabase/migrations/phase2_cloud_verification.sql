-- ==============================================================================
-- Equivance: Phase 2 Supabase Cloud Infrastructure Verification & Setup
-- Project: zwcitpiloonnzhallytf
-- ==============================================================================

-- 1. Ensure Private 'reports' Storage Bucket Exists
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

-- 2. Ensure Realtime Publication Includes 'scans' Table
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'scans'
  ) then
    alter publication supabase_realtime add table public.scans;
  end if;
end $$;

-- 3. Ensure Auth Trigger & Profile Auto-Creation Function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, subscription_tier)
  values (new.id, new.email, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Status Check: Verify All 9 Tables & RLS Status
select 
  tablename, 
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles', 
    'scans', 
    'violations', 
    'api_keys', 
    'ai_fix_cache', 
    'teams', 
    'team_members', 
    'monitors', 
    'stripe_webhook_events'
  )
order by tablename;
