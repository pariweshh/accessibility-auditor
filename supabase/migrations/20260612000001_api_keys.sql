-- Create API keys table
create table public.api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  key_hash text not null unique,
  key_preview text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_used_at timestamp with time zone
);

-- Enable RLS
alter table public.api_keys enable row level security;

-- RLS Policies
create policy "Users can view own API keys" on public.api_keys
  for select using (auth.uid() = user_id);

create policy "Users can insert own API keys" on public.api_keys
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own API keys" on public.api_keys
  for delete using (auth.uid() = user_id);

-- Create index for fast hash lookups
create index idx_api_keys_key_hash on public.api_keys (key_hash);
