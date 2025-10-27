-- Tabela przechowująca tokeny płatnicze dla płatności rekurencyjnych
-- Jeśli tabela user_payment_tokens nie istnieje, utwórz ją
CREATE TABLE IF NOT EXISTS user_payment_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dodaj kolumny jeśli nie istnieją (bezpieczne dodawanie)
DO $$ 
BEGIN
  -- PayU token information
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_payment_tokens' AND column_name = 'payu_token') THEN
    ALTER TABLE user_payment_tokens ADD COLUMN payu_token VARCHAR(255) NOT NULL DEFAULT '' UNIQUE;
    ALTER TABLE user_payment_tokens ALTER COLUMN payu_token DROP DEFAULT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_payment_tokens' AND column_name = 'token_type') THEN
    ALTER TABLE user_payment_tokens ADD COLUMN token_type VARCHAR(50) NOT NULL DEFAULT 'CARD_TOKEN';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_payment_tokens' AND column_name = 'status') THEN
    ALTER TABLE user_payment_tokens ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked'));
  END IF;
  
  -- Card information (masked for security)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_payment_tokens' AND column_name = 'masked_card_number') THEN
    ALTER TABLE user_payment_tokens ADD COLUMN masked_card_number VARCHAR(20);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_payment_tokens' AND column_name = 'card_brand') THEN
    ALTER TABLE user_payment_tokens ADD COLUMN card_brand VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_payment_tokens' AND column_name = 'expiration_month') THEN
    ALTER TABLE user_payment_tokens ADD COLUMN expiration_month VARCHAR(2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_payment_tokens' AND column_name = 'expiration_year') THEN
    ALTER TABLE user_payment_tokens ADD COLUMN expiration_year VARCHAR(4);
  END IF;
  
  -- Usage tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_payment_tokens' AND column_name = 'first_payu_order_id') THEN
    ALTER TABLE user_payment_tokens ADD COLUMN first_payu_order_id VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_payment_tokens' AND column_name = 'usage_count') THEN
    ALTER TABLE user_payment_tokens ADD COLUMN usage_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_payment_tokens' AND column_name = 'last_used_at') THEN
    ALTER TABLE user_payment_tokens ADD COLUMN last_used_at TIMESTAMPTZ;
  END IF;
  
  -- PayU response storage
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_payment_tokens' AND column_name = 'payu_token_response') THEN
    ALTER TABLE user_payment_tokens ADD COLUMN payu_token_response JSONB;
  END IF;
  
  -- Additional timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_payment_tokens' AND column_name = 'expires_at') THEN
    ALTER TABLE user_payment_tokens ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create indexes separately (with IF NOT EXISTS for safety)
CREATE INDEX IF NOT EXISTS idx_user_payment_tokens_user_id ON user_payment_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payment_tokens_token ON user_payment_tokens(payu_token);
CREATE INDEX IF NOT EXISTS idx_user_payment_tokens_status ON user_payment_tokens(status);
CREATE INDEX IF NOT EXISTS idx_user_payment_tokens_expires ON user_payment_tokens(expires_at);

-- RLS policies for user_payment_tokens (drop existing if they exist)
ALTER TABLE user_payment_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own payment tokens" ON user_payment_tokens;
DROP POLICY IF EXISTS "Service role can insert payment tokens" ON user_payment_tokens;
DROP POLICY IF EXISTS "Service role can update payment tokens" ON user_payment_tokens;
DROP POLICY IF EXISTS "Users can delete own payment tokens" ON user_payment_tokens;

-- Users can only see their own tokens
CREATE POLICY "Users can view own payment tokens" ON user_payment_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Only system/service can insert tokens (from webhooks)
CREATE POLICY "Service role can insert payment tokens" ON user_payment_tokens
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Only system/service can update tokens
CREATE POLICY "Service role can update payment tokens" ON user_payment_tokens
  FOR UPDATE USING (auth.role() = 'service_role');

-- Users can delete their own tokens (revoke)
CREATE POLICY "Users can delete own payment tokens" ON user_payment_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp (recreate if exists)
CREATE OR REPLACE FUNCTION update_user_payment_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_payment_tokens_updated_at ON user_payment_tokens;
CREATE TRIGGER user_payment_tokens_updated_at
  BEFORE UPDATE ON user_payment_tokens
  FOR EACH ROW EXECUTE FUNCTION update_user_payment_tokens_updated_at();