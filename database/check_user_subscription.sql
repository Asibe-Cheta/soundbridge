-- Check subscription status for specific user
-- User ID: bd8a455d-a54d-45c5-968d-e4cf5e8d928e

-- Check if subscription exists
SELECT 
  id,
  user_id,
  tier,
  status,
  billing_cycle,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_start_date,
  subscription_renewal_date,
  subscription_ends_at,
  created_at,
  updated_at
FROM user_subscriptions
WHERE user_id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'
ORDER BY created_at DESC;

-- Check all subscriptions (including inactive)
SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(CASE WHEN tier = 'pro' THEN 1 END) as pro_count,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
FROM user_subscriptions
WHERE user_id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';
