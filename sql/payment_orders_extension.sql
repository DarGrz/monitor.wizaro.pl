-- Rozszerzenie istniejącej tabeli payment_orders o pola dla płatności rekurencyjnych
-- Jeśli tabela payment_orders nie istnieje, trzeba będzie ją najpierw utworzyć

-- Sprawdź czy tabela istnieje, jeśli nie - utwórz ją
CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dodaj nowe kolumny dla płatności rekurencyjnych (użyj IF NOT EXISTS dla bezpieczeństwa)
DO $$ 
BEGIN
  -- PayU specific fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'payu_order_id') THEN
    ALTER TABLE payment_orders ADD COLUMN payu_order_id VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'ext_order_id') THEN
    ALTER TABLE payment_orders ADD COLUMN ext_order_id VARCHAR(255);
  END IF;
  
  -- Order details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'description') THEN
    ALTER TABLE payment_orders ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'amount') THEN
    ALTER TABLE payment_orders ADD COLUMN amount INTEGER NOT NULL DEFAULT 0; -- w groszach
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'currency') THEN
    ALTER TABLE payment_orders ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'PLN';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'status') THEN
    ALTER TABLE payment_orders ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'NEW';
  END IF;
  
  -- Subscription-related fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'is_subscription') THEN
    ALTER TABLE payment_orders ADD COLUMN is_subscription BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'subscription_id') THEN
    ALTER TABLE payment_orders ADD COLUMN subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'is_recurring') THEN
    ALTER TABLE payment_orders ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'recurring_type') THEN
    ALTER TABLE payment_orders ADD COLUMN recurring_type VARCHAR(20) CHECK (recurring_type IN ('FIRST', 'STANDARD'));
  END IF;
  
  -- Customer information
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'customer_ip') THEN
    ALTER TABLE payment_orders ADD COLUMN customer_ip INET;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'customer_email') THEN
    ALTER TABLE payment_orders ADD COLUMN customer_email VARCHAR(255);
  END IF;
  
  -- PayU response data
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'payu_response') THEN
    ALTER TABLE payment_orders ADD COLUMN payu_response JSONB;
  END IF;
  
  -- Webhook data
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'webhook_received_at') THEN
    ALTER TABLE payment_orders ADD COLUMN webhook_received_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'webhook_data') THEN
    ALTER TABLE payment_orders ADD COLUMN webhook_data JSONB;
  END IF;
END $$;

-- Utwórz indeksy jeśli nie istnieją
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_payu_order_id ON payment_orders(payu_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_ext_order_id ON payment_orders(ext_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_subscription_id ON payment_orders(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_is_subscription ON payment_orders(is_subscription) WHERE is_subscription = true;
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at);

-- Włącz RLS jeśli nie jest włączone
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- Usuń istniejące policies jeśli istnieją i utwórz nowe
DROP POLICY IF EXISTS "Users can view own payment orders" ON payment_orders;
DROP POLICY IF EXISTS "Users can insert own payment orders" ON payment_orders;
DROP POLICY IF EXISTS "Service role can update payment orders" ON payment_orders;

-- Users can only see their own payment orders
CREATE POLICY "Users can view own payment orders" ON payment_orders
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own payment orders
CREATE POLICY "Users can insert own payment orders" ON payment_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only system/service can update payment orders (webhooks)
CREATE POLICY "Service role can update payment orders" ON payment_orders
  FOR UPDATE USING (auth.role() = 'service_role');

-- Utwórz trigger do updated_at jeśli nie istnieje
CREATE OR REPLACE FUNCTION update_payment_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_orders_updated_at ON payment_orders;
CREATE TRIGGER payment_orders_updated_at
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW EXECUTE FUNCTION update_payment_orders_updated_at();