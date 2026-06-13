-- Create ai_fix_cache table to store AI fixes
create table if not exists public.ai_fix_cache (
  key_hash text primary key,
  issue_id text,
  original_html text,
  model text not null,
  suggested_fix text not null,
  explanation text not null,
  confidence text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.ai_fix_cache enable row level security;

-- Drop policies if they already exist
drop policy if exists "Allow authenticated users to read cache" on public.ai_fix_cache;
drop policy if exists "Allow authenticated users to insert cache" on public.ai_fix_cache;

-- Policies: allow any authenticated user to select and insert cache entries
create policy "Allow authenticated users to read cache" on public.ai_fix_cache
  for select to authenticated using (true);

create policy "Allow authenticated users to insert cache" on public.ai_fix_cache
  for insert to authenticated with check (true);
