-- Alternatywna wersja: Automatyczne obliczanie cen rocznych z rabatem procentowym
-- Cena roczna = cena miesięczna netto * 12 * 0.8 (20% rabatu)

-- Funkcja obliczająca wszystkie ceny automatycznie z rabatem 20%
CREATE OR REPLACE FUNCTION calculate_all_prices_with_discount()
RETURNS TRIGGER AS $$
BEGIN
  -- Oblicz cenę roczną netto z 20% rabatem (80% z ceny pełnej)
  NEW.price_yearly_net = ROUND(NEW.price_monthly_net * 12 * 0.8);
  
  -- Następnie oblicz ceny brutto z VAT 23%
  NEW.price_monthly_gross = ROUND(NEW.price_monthly_net * 1.23);
  NEW.price_yearly_gross = ROUND(NEW.price_yearly_net * 1.23);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Usuń stary trigger
DROP TRIGGER IF EXISTS calculate_all_prices_trigger ON subscription_plans;
DROP TRIGGER IF EXISTS calculate_gross_prices_trigger ON subscription_plans;

-- Utwórz nowy trigger
CREATE TRIGGER calculate_all_prices_with_discount_trigger
  BEFORE INSERT OR UPDATE OF price_monthly_net
  ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION calculate_all_prices_with_discount();

-- Aktualizuj istniejące rekordy z rabatem 20%
UPDATE subscription_plans 
SET 
  price_yearly_net = ROUND(price_monthly_net * 12 * 0.8),
  price_monthly_gross = ROUND(price_monthly_net * 1.23),
  price_yearly_gross = ROUND((price_monthly_net * 12 * 0.8) * 1.23)
WHERE price_monthly_net IS NOT NULL;

-- Wyświetl rezultat
SELECT 
  id,
  display_name,
  price_monthly_net as monthly_net,
  price_monthly_gross as monthly_gross,
  price_yearly_net as yearly_net,
  price_yearly_gross as yearly_gross,
  ROUND((price_monthly_net * 12 - price_yearly_net) / (price_monthly_net * 12) * 100, 1) as yearly_discount_percent
FROM subscription_plans 
WHERE is_active = true
ORDER BY display_order;