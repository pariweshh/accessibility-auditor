-- Create reports storage bucket if it does not exist
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;
