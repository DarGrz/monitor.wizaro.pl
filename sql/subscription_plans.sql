-- Tabela przechowująca plany subskrypcji
-- Wszystkie ceny i szczegóły planów są w bazie danych
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dodaj kolumny jeśli nie istnieją (bezpieczne dodawanie)
DO $$ 
BEGIN
  -- Pricing information (wszystkie kwoty w groszach)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price_monthly_net') THEN
    ALTER TABLE subscription_plans ADD COLUMN price_monthly_net INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE subscription_plans ALTER COLUMN price_monthly_net DROP DEFAULT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price_monthly_gross') THEN
    ALTER TABLE subscription_plans ADD COLUMN price_monthly_gross INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE subscription_plans ALTER COLUMN price_monthly_gross DROP DEFAULT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price_yearly_net') THEN
    ALTER TABLE subscription_plans ADD COLUMN price_yearly_net INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE subscription_plans ALTER COLUMN price_yearly_net DROP DEFAULT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price_yearly_gross') THEN
    ALTER TABLE subscription_plans ADD COLUMN price_yearly_gross INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE subscription_plans ALTER COLUMN price_yearly_gross DROP DEFAULT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'currency') THEN
    ALTER TABLE subscription_plans ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'PLN';
  END IF;
  
  -- Plan features
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'max_companies') THEN
    ALTER TABLE subscription_plans ADD COLUMN max_companies INTEGER NOT NULL DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'max_opinion_removals_monthly') THEN
    ALTER TABLE subscription_plans ADD COLUMN max_opinion_removals_monthly INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'has_negative_monitoring') THEN
    ALTER TABLE subscription_plans ADD COLUMN has_negative_monitoring BOOLEAN NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'has_weekly_reports') THEN
    ALTER TABLE subscription_plans ADD COLUMN has_weekly_reports BOOLEAN NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'has_email_notifications') THEN
    ALTER TABLE subscription_plans ADD COLUMN has_email_notifications BOOLEAN NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'has_instant_notifications') THEN
    ALTER TABLE subscription_plans ADD COLUMN has_instant_notifications BOOLEAN NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'additional_services_discount_percent') THEN
    ALTER TABLE subscription_plans ADD COLUMN additional_services_discount_percent INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  -- Plan status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'is_active') THEN
    ALTER TABLE subscription_plans ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'display_order') THEN
    ALTER TABLE subscription_plans ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Dodaj indeksy
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_order ON subscription_plans(display_order);

-- RLS policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active plans" ON subscription_plans;
DROP POLICY IF EXISTS "Only admins can modify plans" ON subscription_plans;

-- Wszyscy mogą odczytywać aktywne plany
CREATE POLICY "Anyone can read active plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- Tylko administratorzy mogą modyfikować plany
CREATE POLICY "Only admins can modify plans" ON subscription_plans
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger do aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Wstaw domyślne plany (tylko ceny netto - brutto będą obliczone automatycznie przez trigger)
INSERT INTO subscription_plans (
  id, name, display_name, description,
  price_monthly_net, price_yearly_net,
  max_companies, max_opinion_removals_monthly,
  has_negative_monitoring, has_weekly_reports, has_email_notifications, 
  has_instant_notifications, additional_services_discount_percent,
  is_active, display_order
) VALUES 
(
  'basic',
  'basic', 
  'Plan Podstawowy',
  'Idealny dla małych firm rozpoczynających dbanie o swój wizerunek w internecie.',
  64959, 568000,  -- 649.59 PLN netto/miesiąc, 5680 PLN netto/rok (brutto będzie obliczone automatycznie)
  1, 2,
  true, false, true, false, 0,
  true, 1
),
(
  'professional',
  'professional',
  'Plan Profesjonalny', 
  'Dla firm które chcą kompleksowo dbać o swój wizerunek z dodatkowymi funkcjami.',
  99900, 999000,  -- 999 PLN netto/miesiąc, 9990 PLN netto/rok (brutto będzie obliczone automatycznie)
  5, 5,
  true, true, true, true, 10,
  true, 2
),
(
  'enterprise',
  'enterprise',
  'Plan Enterprise',
  'Dla dużych firm wymagających zaawansowanych funkcji i nielimitowanego monitoringu.',
  39900, 399000,   -- 399 PLN netto/miesiąc, 3990 PLN netto/rok (brutto będzie obliczone automatycznie)
  999, 10,
  true, true, true, true, 20,
  true, 3
)
ON CONFLICT (id) DO NOTHING;