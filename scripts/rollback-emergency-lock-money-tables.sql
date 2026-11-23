-- Rollback for supabase/migrations/20261125100000_emergency_lock_money_tables.sql
-- Only run this if the lockdown broke something legitimate you need to
-- restore immediately -- it recreates the exact pre-fix permissive state
-- (self-writable wallet balance, bank verification, tip rows) on all five
-- tables. Prefer fixing the specific broken caller over rolling this back.

-- user_wallets
GRANT INSERT, UPDATE, DELETE ON public.user_wallets TO authenticated;
CREATE POLICY "Users can update their own wallets" ON public.user_wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- creator_bank_accounts
GRANT UPDATE, INSERT ON public.creator_bank_accounts TO authenticated;

-- wallet_transactions
GRANT INSERT, UPDATE, DELETE ON public.wallet_transactions TO authenticated;
CREATE POLICY "Users can insert their own transactions" ON public.wallet_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- creator_tips
GRANT INSERT, UPDATE, DELETE ON public.creator_tips TO authenticated;
CREATE POLICY "Users can insert tips they send" ON public.creator_tips
  FOR INSERT WITH CHECK (auth.uid() = tipper_id);

-- tips
GRANT INSERT, UPDATE, DELETE ON public.tips TO authenticated;
CREATE POLICY "Users can insert tips they send" ON public.tips
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
