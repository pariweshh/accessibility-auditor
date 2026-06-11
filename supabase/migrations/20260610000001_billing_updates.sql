-- Add billing fields to profiles table
alter table public.profiles 
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text default 'inactive' not null;
