-- Skrypt diagnostyczny dla sprawdzenia struktury bazy danych

-- 1. Sprawdź czy tabele istnieją
SELECT 
  tablename,
  schemaname
FROM pg_tables 
WHERE tablename IN (
  'subscription_plans', 
  'user_subscriptions', 
  'services', 
  'service_orders', 
  'payment_history',
  'subscription_usage'
)
ORDER BY tablename;

-- 2. Sprawdź strukturę tabeli subscription_plans
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'subscription_plans'
ORDER BY ordinal_position;

-- 3. Sprawdź strukturę tabeli user_subscriptions
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- 4. Sprawdź czy funkcje pomocnicze istnieją
SELECT 
  proname as function_name,
  prosrc as function_definition
FROM pg_proc 
WHERE proname IN (
  'update_updated_at_column',
  'reset_monthly_limits', 
  'can_use_subscription_service',
  'calculate_discounted_price'
);

-- 5. Sprawdź czy widok user_subscription_limits istnieje
SELECT 
  viewname,
  definition
FROM pg_views 
WHERE viewname = 'user_subscription_limits';

-- 6. Sprawdź istniejące dane w subscription_plans (jeśli tabela istnieje)
-- SELECT * FROM subscription_plans WHERE is_active = TRUE;
