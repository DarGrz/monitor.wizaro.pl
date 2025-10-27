-- Tabela przechowująca informacje o subskrypcjach użytkowników
-- Jeśli tabela user_subscriptions nie istnieje, utwórz ją
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dodaj kolumny jeśli nie istnieją (bezpieczne dodawanie)
DO $$ 
BEGIN
  -- Basic subscription fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'plan_id') THEN
    ALTER TABLE user_subscriptions ADD COLUMN plan_id VARCHAR(50) NOT NULL DEFAULT 'basic';
    ALTER TABLE user_subscriptions ALTER COLUMN plan_id DROP DEFAULT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'billing_cycle') THEN
    ALTER TABLE user_subscriptions ADD COLUMN billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly'));
    ALTER TABLE user_subscriptions ALTER COLUMN billing_cycle DROP DEFAULT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'amount') THEN
    ALTER TABLE user_subscriptions ADD COLUMN amount INTEGER NOT NULL DEFAULT 0; -- w groszach
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'currency') THEN
    ALTER TABLE user_subscriptions ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'PLN';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'status') THEN
    ALTER TABLE user_subscriptions ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'past_due', 'canceled', 'failed'));
  END IF;
  
  -- PayU specific fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'payu_order_id') THEN
    ALTER TABLE user_subscriptions ADD COLUMN payu_order_id VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'ext_order_id') THEN
    ALTER TABLE user_subscriptions ADD COLUMN ext_order_id VARCHAR(255) UNIQUE;
  END IF;
  
  -- Subscription period tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'current_period_start') THEN
    ALTER TABLE user_subscriptions ADD COLUMN current_period_start TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'current_period_end') THEN
    ALTER TABLE user_subscriptions ADD COLUMN current_period_end TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'next_payment_date') THEN
    ALTER TABLE user_subscriptions ADD COLUMN next_payment_date TIMESTAMPTZ;
  END IF;
  
  -- Payment tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'last_payment_date') THEN
    ALTER TABLE user_subscriptions ADD COLUMN last_payment_date TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'last_payment_status') THEN
    ALTER TABLE user_subscriptions ADD COLUMN last_payment_status VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'payment_attempts') THEN
    ALTER TABLE user_subscriptions ADD COLUMN payment_attempts INTEGER DEFAULT 0;
  END IF;
  
  -- Customer data
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'customer_data') THEN
    ALTER TABLE user_subscriptions ADD COLUMN customer_data JSONB;
  END IF;
  
  -- PayU response storage
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'payu_response') THEN
    ALTER TABLE user_subscriptions ADD COLUMN payu_response JSONB;
  END IF;
  
  -- First payment flag (important for recurring)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'is_first_payment') THEN
    ALTER TABLE user_subscriptions ADD COLUMN is_first_payment BOOLEAN DEFAULT true;
  END IF;
  
  -- Additional timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'canceled_at') THEN
    ALTER TABLE user_subscriptions ADD COLUMN canceled_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create indexes separately (with IF NOT EXISTS for safety)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_ext_order_id ON user_subscriptions(ext_order_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_payment ON user_subscriptions(next_payment_date) WHERE status = 'active';

-- RLS policies for user_subscriptions (drop existing if they exist)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Service role can update subscriptions" ON user_subscriptions;

-- Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own subscriptions (when creating)
CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only system/service can update subscriptions (webhooks)
CREATE POLICY "Service role can update subscriptions" ON user_subscriptions
  FOR UPDATE USING (auth.role() = 'service_role');

-- Trigger to update updated_at timestamp (recreate if exists)
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_user_subscriptions_updated_at();