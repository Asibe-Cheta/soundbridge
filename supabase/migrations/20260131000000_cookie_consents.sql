-- Cookie consent tracking for GDPR compliance
create table if not exists public.cookie_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  consent_status text not null check (consent_status in ('accepted', 'rejected', 'customized')),
  categories jsonb not null,
  consent_version integer not null default 1,
  user_agent text,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists cookie_consents_user_id_idx on public.cookie_consents (user_id);
create index if not exists cookie_consents_created_at_idx on public.cookie_consents (created_at desc);

alter table public.cookie_consents enable row level security;

create policy "Allow cookie consent inserts"
  on public.cookie_consents
  for insert
  with check (true);
