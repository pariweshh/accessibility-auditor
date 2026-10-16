-- Phase 5: White-Label Custom Branding for Agency Tier

alter table public.teams
  add column if not exists brand_name text,
  add column if not exists brand_logo_url text,
  add column if not exists brand_primary_color text default '#4f46e5',
  add column if not exists brand_tagline text,
  add column if not exists brand_footer_text text,
  add column if not exists brand_hide_watermark boolean default false;
