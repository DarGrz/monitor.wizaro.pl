-- ==================================================
-- KOMPLENTY SYSTEM CENOWY - SUBSCRIPTION PLANS
-- Jeden plik do uruchomienia w Supabase
-- ==================================================

-- Usuń istniejącą tabelę jeśli istnieje (CASCADE usuwa też triggery)
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- Usuń istniejące funkcje (triggery są usunięte przez CASCADE wyżej)
DROP FUNCTION IF EXISTS calculate_gross_prices();
DROP FUNCTION IF EXISTS update_subscription_plans_updated_at();

-- ==================================================
-- 1. TWORZENIE TABELI
-- ==================================================

CREATE TABLE subscription_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Pricing information (wszystkie kwoty w groszach)
  price_monthly_net INTEGER NOT NULL,     -- cena miesięczna netto w groszach
  price_monthly_gross INTEGER NOT NULL,   -- cena miesięczna brutto w groszach (obliczana automatycznie)
  price_yearly_net INTEGER NOT NULL,      -- cena roczna netto w groszach  
  price_yearly_gross INTEGER NOT NULL,    -- cena roczna brutto w groszach (obliczana automatycznie)
  currency VARCHAR(3) NOT NULL DEFAULT 'PLN',
  
  -- Plan features
  max_companies INTEGER NOT NULL DEFAULT 1,
  max_opinion_removals_monthly INTEGER NOT NULL DEFAULT 0,
  has_negative_monitoring BOOLEAN NOT NULL DEFAULT true,
  has_weekly_reports BOOLEAN NOT NULL DEFAULT false,
  has_email_notifications BOOLEAN NOT NULL DEFAULT true,
  has_instant_notifications BOOLEAN NOT NULL DEFAULT false,
  additional_services_discount_percent INTEGER NOT NULL DEFAULT 0,
  
  -- Plan status
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================
-- 2. INDEKSY
-- ==================================================

CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_order ON subscription_plans(display_order);
CREATE INDEX idx_subscription_plans_name ON subscription_plans(name);

-- ==================================================
-- 3. FUNKCJE I TRIGGERY
-- ==================================================

-- Funkcja obliczająca ceny brutto z VAT 23%
CREATE OR REPLACE FUNCTION calculate_gross_prices()
RETURNS TRIGGER AS $$
BEGIN
  -- VAT rate 23% (1.23 multiplier)
  NEW.price_monthly_gross = ROUND(NEW.price_monthly_net * 1.23);
  NEW.price_yearly_gross = ROUND(NEW.price_yearly_net * 1.23);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger obliczający ceny brutto
CREATE TRIGGER calculate_gross_prices_trigger
  BEFORE INSERT OR UPDATE OF price_monthly_net, price_yearly_net
  ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION calculate_gross_prices();

-- Funkcja aktualizująca updated_at
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger aktualizujący updated_at
CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_subscription_plans_updated_at();

-- ==================================================
-- 4. RLS POLICIES
-- ==================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Wszyscy mogą odczytywać aktywne plany
CREATE POLICY "Anyone can read active plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- Tylko administratorzy mogą modyfikować plany
CREATE POLICY "Only admins can modify plans" ON subscription_plans
  FOR ALL USING (auth.role() = 'service_role');

-- ==================================================
-- 5. DANE POCZĄTKOWE
-- ==================================================

-- Wstaw domyślne plany (tylko ceny netto - brutto będą obliczone automatycznie)
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
  64959, 568000,  -- 649.59 PLN netto/miesiąc, 5680 PLN netto/rok
  1, 2,
  true, false, true, false, 0,
  true, 1
),
(
  'professional',
  'professional',
  'Plan Profesjonalny', 
  'Dla firm które chcą kompleksowo dbać o swój wizerunek z dodatkowymi funkcjami.',
  99900, 999000,  -- 999 PLN netto/miesiąc, 9990 PLN netto/rok
  5, 5,
  true, true, true, true, 10,
  true, 2
),
(
  'enterprise',
  'enterprise',
  'Plan Enterprise',
  'Dla dużych firm wymagających zaawansowanych funkcji i nielimitowanego monitoringu.',
  39900, 399000,   -- 1299 PLN netto/miesiąc, 3990 PLN netto/rok
  999, 10,
  true, true, true, true, 20,
  true, 3
);

-- ==================================================
-- 6. WERYFIKACJA
-- ==================================================

-- Sprawdź czy wszystko działa poprawnie
SELECT 
  '=== WERYFIKACJA SYSTEMU CENOWEGO ===' as info;

SELECT 
  id, 
  name,
  display_name,
  price_monthly_net/100.0 as monthly_net_pln,
  price_monthly_gross/100.0 as monthly_gross_pln,
  price_yearly_net/100.0 as yearly_net_pln,
  price_yearly_gross/100.0 as yearly_gross_pln,
  ROUND((price_monthly_gross::decimal / price_monthly_net - 1) * 100, 2) as vat_percent,
  max_companies,
  is_active,
  display_order
FROM subscription_plans 
WHERE is_active = true
ORDER BY display_order;

SELECT 
  '=== SYSTEM GOTOWY DO UŻYCIA ===' as status,
  'Ceny brutto obliczają się automatycznie z VAT 23%' as info;

-- ==================================================
-- INSTRUKCJE UŻYTKOWANIA:
-- ==================================================

/*
DODAWANIE NOWEGO PLANU (podaj tylko cenę netto):

INSERT INTO subscription_plans (
  id, name, display_name, description,
  price_monthly_net, price_yearly_net,
  max_companies, is_active, display_order
) VALUES (
  'premium',
  'premium',
  'Plan Premium',
  'Najlepszy plan dla największych firm',
  149900,   -- 1499 PLN netto/miesiąc (brutto: 1843.77 PLN)
  1499000,  -- 14990 PLN netto/rok (brutto: 18437.70 PLN)
  999, true, 4
);

AKTUALIZACJA CEN (podaj tylko netto):

UPDATE subscription_plans 
SET price_monthly_net = 79900  -- 799 PLN netto (brutto: 982.77 PLN)
WHERE id = 'basic';

SPRAWDZENIE AKTUALNYCH CEN:

SELECT 
  id, display_name,
  price_monthly_net/100.0 as monthly_net_pln,
  price_monthly_gross/100.0 as monthly_gross_pln
FROM subscription_plans 
WHERE is_active = true;
*/