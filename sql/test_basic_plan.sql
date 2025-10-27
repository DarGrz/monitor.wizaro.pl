-- Test podstawowy - dodanie planu z minimalnymi danymi
-- Użyj tego po uruchomieniu subscription_plans.sql i auto_calculate_gross_prices.sql

-- Sprawdź czy tabela istnieje i ma potrzebne kolumny
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'subscription_plans' 
ORDER BY ordinal_position;

-- Dodaj prosty plan testowy
INSERT INTO subscription_plans (
  id, 
  name, 
  display_name,
  price_monthly_net,
  price_yearly_net
) VALUES (
  'test',
  'test',
  'Plan Testowy',
  50000,   -- 500 PLN netto/miesiąc (brutto: 615 PLN)
  500000   -- 5000 PLN netto/rok (brutto: 6150 PLN)
)
ON CONFLICT (id) DO UPDATE SET
  price_monthly_net = EXCLUDED.price_monthly_net,
  price_yearly_net = EXCLUDED.price_yearly_net;

-- Sprawdź rezultat
SELECT 
  id, 
  name,
  price_monthly_net/100.0 as monthly_net_pln,
  price_monthly_gross/100.0 as monthly_gross_pln,
  price_yearly_net/100.0 as yearly_net_pln,
  price_yearly_gross/100.0 as yearly_gross_pln,
  CASE 
    WHEN price_monthly_net > 0 THEN 
      ROUND((price_monthly_gross::decimal / price_monthly_net - 1) * 100, 2) 
    ELSE 0 
  END as vat_percent
FROM subscription_plans 
WHERE id = 'test';