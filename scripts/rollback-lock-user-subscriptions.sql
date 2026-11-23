-- Rollback for supabase/migrations/20261127100000_lock_user_subscriptions.sql
GRANT INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
