-- Migration: 20260617000000_stripe_webhook_events.sql
-- Description: Idempotency log for Stripe webhook deliveries to prevent duplicate processing.

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Service role client bypasses RLS; public/anon have zero read/write access)
alter table public.stripe_webhook_events enable row level security;

-- Performance index for timestamp queries and potential retention pruning
create index if not exists idx_stripe_webhook_events_processed_at on public.stripe_webhook_events (processed_at desc);
