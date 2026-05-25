-- Fix grant_institutional_access for the live profiles schema.
-- profiles has updated_at, not subscription_updated_at.

create or replace function public.grant_institutional_access(
  p_user_id     uuid,
  p_institution text,
  p_access_tier text default 'premium'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into institutional_access (user_id, institution, access_tier, expires_at)
  values (p_user_id, p_institution, p_access_tier, now() + interval '1 year')
  on conflict (user_id, institution) do update
    set access_tier = excluded.access_tier,
        granted_at  = now(),
        expires_at  = now() + interval '1 year',
        is_active   = true;

  update profiles
  set subscription_tier       = p_access_tier,
      subscription_status     = 'active',
      subscription_period_end = now() + interval '1 year',
      updated_at              = now()
  where id = p_user_id;
end;
$$;

grant execute on function public.grant_institutional_access(uuid, text, text) to authenticated;
