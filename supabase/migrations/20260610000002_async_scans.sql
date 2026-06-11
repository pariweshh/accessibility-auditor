-- Phase 3: Add async scan status tracking columns
alter table public.scans
  add column if not exists status text not null default 'completed'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  add column if not exists error_message text;

-- Allow service role (Edge Function) to update any scan row
create policy "Service role can update scans"
  on public.scans for update
  using (true)
  with check (true);

-- Enable Realtime on scans table so frontend can subscribe to changes
alter publication supabase_realtime add table public.scans;
