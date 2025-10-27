-- Przykłady dodawania/aktualizowania planów
-- Wystarczy podać tylko ceny netto, brutto obliczą się automatycznie

-- Dodanie nowego planu (podaj tylko cenę netto)
-- UWAGA: Uruchom najpierw subscription_plans.sql żeby dodać wszystkie kolumny!
INSERT INTO subscription_plans (
  id, name, display_name, description,
  price_monthly_net, price_yearly_net,
  max_companies, max_opinion_removals_monthly,
  has_negative_monitoring, has_weekly_reports, has_email_notifications, 
  has_instant_notifications, additional_services_discount_percent,
  is_active, display_order
) VALUES (
  'premium',
  'premium',
  'Plan Premium',
  'Plan premium dla największych firm.',
  149900,   -- 1499 PLN netto/miesiąc (brutto: 1843.77 PLN)
  1499000,  -- 14990 PLN netto/rok (brutto: 18437.70 PLN)
  999, 20,
  true, true, true, true, 25,
  true, 4
)
ON CONFLICT (id) DO NOTHING;

-- Aktualizacja ceny istniejącego planu (podaj tylko netto)
UPDATE subscription_plans 
SET 
  price_monthly_net = 79900,  -- 799 PLN netto/miesiąc (brutto zostanie obliczone: 982.77 PLN)
  price_yearly_net = 799000   -- 7990 PLN netto/rok (brutto zostanie obliczone: 9827.70 PLN)
WHERE id = 'basic';

-- Sprawdzenie wyników
SELECT 
  id, 
  name,
  price_monthly_net/100 as monthly_net_pln,
  price_monthly_gross/100 as monthly_gross_pln,
  price_yearly_net/100 as yearly_net_pln,
  price_yearly_gross/100 as yearly_gross_pln
FROM subscription_plans 
ORDER BY display_order;