-- Skrypt SQL do aktualizacji tabel subskrypcyjnych dla integracji z Stripe

-- Aktualizuj tabelę subscription_plans aby zawierała ID produktów i cen Stripe
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT;

-- Dodaj indeksy dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_product ON subscription_plans(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price_monthly ON subscription_plans(stripe_price_id_monthly);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price_yearly ON subscription_plans(stripe_price_id_yearly);

-- Przykładowe aktualizacje planów z ID Stripe (zastąp rzeczywistymi ID z Stripe Dashboard)
-- Te wartości należy zastąpić po utworzeniu produktów w Stripe

UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_starter_plan',
  stripe_price_id_monthly = 'price_starter_monthly',
  stripe_price_id_yearly = 'price_starter_yearly'
WHERE name = 'starter';

UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_professional_plan',
  stripe_price_id_monthly = 'price_professional_monthly', 
  stripe_price_id_yearly = 'price_professional_yearly'
WHERE name = 'professional';

UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_enterprise_plan',
  stripe_price_id_monthly = 'price_enterprise_monthly',
  stripe_price_id_yearly = 'price_enterprise_yearly'
WHERE name = 'enterprise';

-- Aktualizuj tabelę user_subscriptions dla lepszej integracji z Stripe
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE;

-- Dodaj indeksy
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_price ON user_subscriptions(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);

-- Dodaj constrainty dla statusów
ALTER TABLE user_subscriptions 
ADD CONSTRAINT check_user_subscription_status 
CHECK (status IN ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'));

-- Utwórz tabelę do przechowywania historii płatności Stripe
CREATE TABLE IF NOT EXISTS stripe_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  amount_paid INTEGER NOT NULL, -- kwota w groszach
  currency TEXT NOT NULL DEFAULT 'pln',
  status TEXT NOT NULL, -- 'succeeded', 'pending', 'failed', 'canceled', 'paid'
  invoice_pdf_url TEXT,
  failure_reason TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dodaj indeksy dla stripe_payments
CREATE INDEX IF NOT EXISTS idx_stripe_payments_user ON stripe_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_invoice ON stripe_payments(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_customer ON stripe_payments(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_payment_intent ON stripe_payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_status ON stripe_payments(status);

-- Dodaj constrainty dla statusów płatności
ALTER TABLE stripe_payments
ADD CONSTRAINT check_stripe_payment_status 
CHECK (status IN ('succeeded', 'pending', 'failed', 'canceled', 'paid'));

-- RLS policies dla stripe_payments
ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stripe payments" ON stripe_payments
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users WHERE users.id = stripe_payments.user_id));

CREATE POLICY "Service role can manage stripe payments" ON stripe_payments
  FOR ALL USING (auth.role() = 'service_role');

-- Funkcja do pobrania aktywnej subskrypcji użytkownika
CREATE OR REPLACE FUNCTION get_user_active_subscription(user_uuid UUID)
RETURNS TABLE (
  subscription_id UUID,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  plan_name TEXT,
  plan_display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.stripe_subscription_id,
    s.stripe_customer_id,
    s.status,
    s.current_period_start,
    s.current_period_end,
    sp.name,
    sp.display_name
  FROM user_subscriptions s
  LEFT JOIN subscription_plans sp ON s.stripe_price_id = sp.stripe_price_id_monthly 
    OR s.stripe_price_id = sp.stripe_price_id_yearly
  WHERE s.user_id = user_uuid 
    AND s.status IN ('active', 'trialing', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Funkcja do aktualizacji subskrypcji z webhook'a Stripe
CREATE OR REPLACE FUNCTION upsert_stripe_subscription(
  p_stripe_subscription_id TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_price_id TEXT,
  p_status TEXT,
  p_current_period_start TIMESTAMP WITH TIME ZONE,
  p_current_period_end TIMESTAMP WITH TIME ZONE,
  p_trial_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_trial_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_cancel_at_period_end BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  subscription_uuid UUID;
  user_uuid UUID;
BEGIN
  -- Znajdź użytkownika na podstawie customer_id
  SELECT sc.user_id INTO user_uuid
  FROM stripe_customers sc
  WHERE sc.stripe_customer_id = p_stripe_customer_id;
  
  -- Jeśli nie znajdziemy użytkownika, spróbuj na podstawie metadanych
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found for Stripe customer: %', p_stripe_customer_id;
  END IF;

  -- Upsert subskrypcji
  INSERT INTO user_subscriptions (
    user_id,
    stripe_subscription_id,
    stripe_customer_id,
    stripe_price_id,
    status,
    current_period_start,
    current_period_end,
    trial_start,
    trial_end,
    cancel_at_period_end,
    created_at,
    updated_at
  ) VALUES (
    user_uuid,
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_stripe_price_id,
    p_status,
    p_current_period_start,
    p_current_period_end,
    p_trial_start,
    p_trial_end,
    p_cancel_at_period_end,
    NOW(),
    NOW()
  )
  ON CONFLICT (stripe_subscription_id) 
  DO UPDATE SET
    status = EXCLUDED.status,
    stripe_price_id = EXCLUDED.stripe_price_id,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    trial_start = EXCLUDED.trial_start,
    trial_end = EXCLUDED.trial_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    updated_at = NOW()
  RETURNING id INTO subscription_uuid;

  RETURN subscription_uuid;
END;
$$ LANGUAGE plpgsql;

-- Tabela do przechowywania mapowania klientów Stripe
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksy dla tabeli stripe_customers
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_email ON stripe_customers(email);

COMMENT ON TABLE stripe_customers IS 'Mapowanie między użytkownikami a klientami Stripe';
COMMENT ON COLUMN stripe_customers.stripe_customer_id IS 'ID klienta w systemie Stripe';
COMMENT ON COLUMN stripe_customers.email IS 'Email klienta używany w Stripe';

-- RLS policies dla stripe_customers
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stripe customer data" ON stripe_customers
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users WHERE users.id = stripe_customers.user_id));

CREATE POLICY "Service role can manage stripe customers" ON stripe_customers
  FOR ALL USING (auth.role() = 'service_role');
