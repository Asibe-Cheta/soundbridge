# Demand-led events migration (2 steps)

Postgres cannot add an enum value and use it in the same transaction (error `55P04`).

Run in Supabase SQL editor **in order**, as **two separate runs**:

1. `demand_led_events_1_enum.sql` — adds `event_poll` to `message_type`
2. `demand_led_events_2_schema.sql` — tables, RLS, RPCs

Supabase CLI migrations (same order):

- `supabase/migrations/20260531115900_demand_led_events_message_type_enum.sql`
- `supabase/migrations/20260531120000_demand_led_events.sql`
