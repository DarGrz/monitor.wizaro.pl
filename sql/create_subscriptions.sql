-- Tabela dla planów subskrypcji
DROP TABLE IF EXISTS subscription_plans CASCADE;

CREATE TABLE subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE, -- 'basic', 'professional', 'enterprise'
  display_name VARCHAR(100) NOT NULL, -- 'Basic', 'Professional', 'Enterprise'
  description TEXT,
  price_monthly_net DECIMAL(10,2) NOT NULL, -- cena netto miesięcznie
  price_monthly_gross DECIMAL(10,2) NOT NULL, -- cena brutto miesięcznie
  price_yearly_net DECIMAL(10,2), -- cena netto rocznie
  price_yearly_gross DECIMAL(10,2), -- cena brutto rocznie
  currency VARCHAR(3) DEFAULT 'PLN',
  
  -- Limity planu
  max_companies INTEGER NOT NULL DEFAULT 1,
  max_opinion_removals_monthly INTEGER NOT NULL DEFAULT 0, -- Liczba darmowych usunięć opinii miesięcznie
  
  -- Funkcje planu
  has_negative_monitoring BOOLEAN DEFAULT TRUE, -- Monitoring negatywnych opinii
  has_weekly_reports BOOLEAN DEFAULT TRUE, -- Cotygodniowe raporty
  has_email_notifications BOOLEAN DEFAULT TRUE, -- Powiadomienia e-mail
  has_instant_notifications BOOLEAN DEFAULT TRUE, -- Powiadomienia o nowych wpisach
  
  -- Zniżki na dodatkowe usługi
  additional_services_discount_percent DECIMAL(5,2) DEFAULT 0, -- Zniżka na dodatkowe usługi w %
  
  -- Oszczędności (informacyjne)
  estimated_monthly_savings DECIMAL(10,2) DEFAULT 0, -- Szacunkowe oszczędności miesięcznie
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadane
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Wstaw domyślne plany zgodnie z cennik monitor.wizaro.pl
INSERT INTO subscription_plans (
  name, 
  display_name, 
  description, 
  price_monthly_net, 
  price_monthly_gross, 
  price_yearly_net, 
  price_yearly_gross, 
  max_companies, 
  max_opinion_removals_monthly,
  has_negative_monitoring,
  has_weekly_reports,
  has_email_notifications,
  has_instant_notifications,
  additional_services_discount_percent,
  estimated_monthly_savings
) VALUES
(
  'basic', 
  'Basic', 
  'Ochrona 1 firmy. Monitoring negatywnych opinii, cotygodniowy raport e-mail, powiadomienia o nowych wpisach. Do 3 usuniętych opinii miesięcznie w cenie. Zniżka 10% na dodatkowe usługi usuwania. Dla firm, które chcą zabezpieczyć swój wizerunek i szybko reagować na pierwsze negatywne opinie.',
  599.00, 
  736.77, 
  5990.00, 
  7367.70, 
  1, 
  3,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  10.00,
  897.00
),
(
  'professional', 
  'Professional', 
  'Ochrona 2 firm. Monitoring negatywnych opinii, cotygodniowy raport e-mail, powiadomienia o nowych wpisach. Do 5 usuniętych opinii miesięcznie w cenie. Zniżka 20% na dodatkowe usługi usuwania. Dla firm, które borykają się z dużą ilością negatywnych opinii i potrzebują regularnej ochrony.',
  999.00, 
  1228.77, 
  9990.00, 
  12287.70, 
  2, 
  5,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  20.00,
  1495.00
),
(
  'enterprise', 
  'Enterprise', 
  'Ochrona do 4 firm. Monitoring negatywnych opinii, cotygodniowe raporty zbiorcze, powiadomienia o nowych wpisach. Do 10 usuniętych opinii miesięcznie w cenie. Zniżka 30% na dodatkowe usługi usuwania. Dla większych przedsiębiorstw i sieci, które muszą stale chronić reputację wielu lokalizacji.',
  1999.00, 
  2458.77, 
  19990.00, 
  24587.70, 
  4, 
  10,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  30.00,
  2990.00
);

-- Tabela dla subskrypcji użytkowników
DROP TABLE IF EXISTS user_subscriptions CASCADE;

CREATE TABLE user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  
  -- Status subskrypcji
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'canceled', 'expired'
  
  -- Daty
  started_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  
  -- Płatności
  billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
  amount_paid_net DECIMAL(10,2), -- kwota netto
  amount_paid_gross DECIMAL(10,2), -- kwota brutto
  currency VARCHAR(3) DEFAULT 'PLN',
  
  -- Wykorzystane limity w bieżącym okresie
  used_opinion_removals INTEGER DEFAULT 0, -- ile usunięć opinii zostało wykorzystanych
  current_period_start TIMESTAMP WITH TIME ZONE, -- początek bieżącego okresu rozliczeniowego
  current_period_end TIMESTAMP WITH TIME ZONE, -- koniec bieżącego okresu rozliczeniowego
  
  -- Identyfikatory zewnętrzne (Stripe, PayU, etc.)
  external_subscription_id VARCHAR(255),
  external_customer_id VARCHAR(255),
  
  -- Metadane
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indeksy
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);
CREATE INDEX idx_subscription_plans_name ON subscription_plans(name);

-- RLS dla subscription_plans (tylko odczyt)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read subscription plans" ON subscription_plans
  FOR SELECT USING (is_active = TRUE);

-- RLS dla user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own subscriptions" ON user_subscriptions
  FOR ALL USING (auth.uid() = (SELECT auth_id FROM users WHERE users.id = user_subscriptions.user_id));

-- Triggery dla updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Komentarze
COMMENT ON TABLE subscription_plans IS 'Plany subskrypcji dostępne w systemie';
COMMENT ON TABLE user_subscriptions IS 'Subskrypcje użytkowników';
COMMENT ON COLUMN user_subscriptions.status IS 'Status subskrypcji: pending, active, canceled, expired';
COMMENT ON COLUMN user_subscriptions.external_subscription_id IS 'ID subskrypcji w systemie płatności (Stripe, PayU, etc.)';

-- Tabela historii płatności
DROP TABLE IF EXISTS payment_history CASCADE;

CREATE TABLE payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  subscription_id UUID REFERENCES user_subscriptions(id), -- NULL dla płatności za usługi jednorazowe
  service_order_id UUID, -- Referencja do service_orders dla usług jednorazowych
  
  -- Dane płatności
  amount_net DECIMAL(10,2) NOT NULL, -- kwota netto
  amount_gross DECIMAL(10,2) NOT NULL, -- kwota brutto
  vat_amount DECIMAL(10,2) NOT NULL, -- kwota VAT
  currency VARCHAR(3) DEFAULT 'PLN',
  status VARCHAR(20) NOT NULL, -- pending, completed, failed, refunded
  payment_method VARCHAR(50), -- stripe, payu, bank_transfer, przelewy24
  external_payment_id VARCHAR(255), -- ID z systemu płatności
  
  -- Opis
  description TEXT,
  invoice_number VARCHAR(50),
  
  -- Daty
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Ograniczenia - płatność dotyczy albo subskrypcji albo usługi jednorazowej
  CONSTRAINT chk_payment_type CHECK (
    (subscription_id IS NOT NULL AND service_order_id IS NULL) OR
    (subscription_id IS NULL AND service_order_id IS NOT NULL)
  )
);

-- Indeksy dla payment_history
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX idx_payment_history_service_order_id ON payment_history(service_order_id);
CREATE INDEX idx_payment_history_status ON payment_history(status);
CREATE INDEX idx_payment_history_payment_date ON payment_history(payment_date);

-- Tabela do śledzenia wykorzystania usług w ramach abonamentu
DROP TABLE IF EXISTS subscription_usage CASCADE;

CREATE TABLE subscription_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  service_type VARCHAR(50) NOT NULL, -- 'opinion_removal', 'profile_removal', etc.
  
  -- Szczegóły wykorzystania
  target_url TEXT, -- URL opinii/profilu, którego dotyczy usługa
  target_description TEXT,
  notes TEXT,
  
  -- Status realizacji
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, failed
  
  -- Daty
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadane
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indeksy dla subscription_usage
CREATE INDEX idx_subscription_usage_user_subscription_id ON subscription_usage(user_subscription_id);
CREATE INDEX idx_subscription_usage_service_type ON subscription_usage(service_type);
CREATE INDEX idx_subscription_usage_status ON subscription_usage(status);
CREATE INDEX idx_subscription_usage_requested_at ON subscription_usage(requested_at);

-- Trigger para updated_at
CREATE TRIGGER update_subscription_usage_updated_at
  BEFORE UPDATE ON subscription_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS dla subscription_usage
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their subscription usage" ON subscription_usage
  FOR ALL USING (
    auth.uid() = (
      SELECT u.auth_id 
      FROM users u 
      JOIN user_subscriptions us ON u.id = us.user_id 
      WHERE us.id = subscription_usage.user_subscription_id
    )
  );

-- RLS dla payment_history
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own payment history" ON payment_history
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users WHERE users.id = payment_history.user_id));

-- Komentarze
COMMENT ON TABLE subscription_plans IS 'Plany subskrypcji dostępne w systemie - Basic, Professional, Enterprise';
COMMENT ON TABLE user_subscriptions IS 'Subskrypcje użytkowników z limitami wykorzystania';
COMMENT ON TABLE subscription_usage IS 'Śledzenie wykorzystania usług w ramach abonamentu';
COMMENT ON TABLE payment_history IS 'Historia płatności za subskrypcje i usługi jednorazowe';
COMMENT ON COLUMN user_subscriptions.status IS 'Status subskrypcji: pending, active, canceled, expired';
COMMENT ON COLUMN user_subscriptions.external_subscription_id IS 'ID subskrypcji w systemie płatności (Stripe, PayU, etc.)';
COMMENT ON COLUMN user_subscriptions.used_opinion_removals IS 'Liczba wykorzystanych usunięć opinii w bieżącym okresie';
COMMENT ON COLUMN payment_history.status IS 'Status płatności: pending, completed, failed, refunded';
COMMENT ON COLUMN subscription_usage.service_type IS 'Typ usługi: opinion_removal, profile_removal, google_business_removal, google_business_reset';
