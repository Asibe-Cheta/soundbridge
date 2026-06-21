-- AI Career Adviser tables (mobile migration parity)
-- See AI_CAREER_ADVISOR_REAL_IMPLEMENTATION.MD / WEB_TEAM_AI_ADVISOR.MD

CREATE TABLE IF NOT EXISTS ai_adviser_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  analyses_used INTEGER NOT NULL DEFAULT 0,
  chats_used INTEGER NOT NULL DEFAULT 0,
  free_demo_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (creator_id, billing_period_start)
);

CREATE TABLE IF NOT EXISTS ai_adviser_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  analysis_json JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_adviser_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent credit top-up confirmation (web confirm endpoint)
CREATE TABLE IF NOT EXISTS ai_adviser_credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_adviser_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_adviser_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_adviser_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_adviser_credit_purchases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_adviser_usage' AND policyname = 'ai_adviser_usage_self'
  ) THEN
    CREATE POLICY "ai_adviser_usage_self" ON ai_adviser_usage
      FOR ALL USING (auth.uid() = creator_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_adviser_analyses' AND policyname = 'ai_adviser_analyses_self'
  ) THEN
    CREATE POLICY "ai_adviser_analyses_self" ON ai_adviser_analyses
      FOR ALL USING (auth.uid() = creator_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_adviser_conversations' AND policyname = 'ai_adviser_conversations_self'
  ) THEN
    CREATE POLICY "ai_adviser_conversations_self" ON ai_adviser_conversations
      FOR ALL USING (auth.uid() = creator_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_adviser_credit_purchases' AND policyname = 'ai_adviser_credit_purchases_self'
  ) THEN
    CREATE POLICY "ai_adviser_credit_purchases_self" ON ai_adviser_credit_purchases
      FOR SELECT USING (auth.uid() = creator_id);
  END IF;
END $$;
