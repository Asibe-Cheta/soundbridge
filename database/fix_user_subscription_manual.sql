-- Manual fix for user subscription
-- User ID: bd8a455d-a54d-45c5-968d-e4cf5e8d928e
-- This will create/update the subscription to Pro status

-- First, check if subscription exists
DO $$
DECLARE
  v_user_id UUID := 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';
  v_subscription_id UUID;
  v_stripe_subscription_id TEXT;
BEGIN
  -- Check if subscription already exists
  SELECT id, stripe_subscription_id INTO v_subscription_id, v_stripe_subscription_id
  FROM user_subscriptions
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_subscription_id IS NOT NULL THEN
    -- Update existing subscription
    UPDATE user_subscriptions
    SET 
      tier = 'pro',
      status = 'active',
      billing_cycle = 'monthly',
      subscription_start_date = COALESCE(subscription_start_date, NOW()),
      subscription_renewal_date = COALESCE(subscription_renewal_date, NOW() + INTERVAL '1 month'),
      subscription_ends_at = NULL,
      money_back_guarantee_eligible = true,
      updated_at = NOW()
    WHERE id = v_subscription_id;
    
    RAISE NOTICE 'Updated existing subscription: %', v_subscription_id;
  ELSE
    -- Create new subscription
    INSERT INTO user_subscriptions (
      user_id,
      tier,
      status,
      billing_cycle,
      subscription_start_date,
      subscription_renewal_date,
      money_back_guarantee_eligible,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      'pro',
      'active',
      'monthly',
      NOW(),
      NOW() + INTERVAL '1 month',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_subscription_id;
    
    RAISE NOTICE 'Created new subscription: %', v_subscription_id;
  END IF;
END $$;

-- Verify the update
SELECT 
  id,
  user_id,
  tier,
  status,
  billing_cycle,
  subscription_start_date,
  subscription_renewal_date,
  created_at,
  updated_at
FROM user_subscriptions
WHERE user_id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'
ORDER BY created_at DESC
LIMIT 1;
