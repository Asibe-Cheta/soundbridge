-- Fix track_event_action: events table uses creator_id, not organizer_id
create or replace function public.track_event_action(
  p_event_id uuid,
  p_action   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator_id uuid;
begin
  select creator_id into v_creator_id from events where id = p_event_id;
  if not found then return; end if;

  insert into event_analytics (event_id, creator_id)
  values (p_event_id, v_creator_id)
  on conflict (event_id) do nothing;

  case p_action
    when 'view' then
      update event_analytics
        set event_page_views = event_page_views + 1,
            updated_at       = now()
        where event_id = p_event_id;

    when 'bookmark' then
      update event_analytics
        set bookmarks_count = bookmarks_count + 1,
            updated_at      = now()
        where event_id = p_event_id;

    when 'unbookmark' then
      update event_analytics
        set bookmarks_count = greatest(0, bookmarks_count - 1),
            updated_at      = now()
        where event_id = p_event_id;

    when 'share_link' then
      update event_analytics
        set shares_link_count = shares_link_count + 1,
            updated_at        = now()
        where event_id = p_event_id;

    when 'share_card' then
      update event_analytics
        set shares_card_count = shares_card_count + 1,
            updated_at        = now()
        where event_id = p_event_id;

    else null;
  end case;
end;
$$;

grant execute on function public.track_event_action(uuid, text) to authenticated;
