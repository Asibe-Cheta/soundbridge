-- Rollback for supabase/migrations/20261126100000_lock_live_session_tips.sql
GRANT INSERT, UPDATE, DELETE ON public.live_session_tips TO authenticated;
CREATE POLICY "Users can send tips" ON public.live_session_tips
  FOR INSERT WITH CHECK (auth.uid() = tipper_id);
