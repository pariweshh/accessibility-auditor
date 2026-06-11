-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  subscription_tier text default 'free' not null,
  stripe_customer_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles RLS Policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Create scans table
create table public.scans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  status text default 'pending' not null, -- 'pending', 'completed', 'failed'
  summary jsonb, -- { critical: 0, serious: 0, moderate: 0, minor: 0 }
  pdf_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on scans
alter table public.scans enable row level security;

-- Scans RLS Policies
create policy "Users can view own scans" on public.scans
  for select using (auth.uid() = user_id);

create policy "Users can insert own scans" on public.scans
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own scans" on public.scans
  for delete using (auth.uid() = user_id);

-- Create violations table to store detailed accessibility issues
create table public.violations (
  id uuid default gen_random_uuid() primary key,
  scan_id uuid references public.scans(id) on delete cascade not null,
  issue_id text not null,
  impact text not null,
  description text not null,
  help text not null,
  help_url text,
  tags text[] not null,
  nodes jsonb not null, -- Array of { html, target, failureSummary }
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on violations
alter table public.violations enable row level security;

-- Violations RLS Policies
create policy "Users can view violations of own scans" on public.violations
  for select using (
    exists (
      select 1 from public.scans
      where scans.id = violations.scan_id and scans.user_id = auth.uid()
    )
  );

create policy "Users can insert violations of own scans" on public.violations
  for insert with check (
    exists (
      select 1 from public.scans
      where scans.id = violations.scan_id and scans.user_id = auth.uid()
    )
  );

-- Automatically create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, subscription_tier)
  values (new.id, new.email, 'free');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for handle_new_user
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
