-- Rollback for supabase/migrations/20261127090000_tip_room_local_rate_limit.sql
DROP TABLE IF EXISTS public.tip_room_local_rate_hits;
