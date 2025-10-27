-- Automatyczne obliczanie cen brutto z VAT 23%
-- Trigger dla tabeli subscription_plans

-- Funkcja obliczająca ceny brutto na podstawie cen netto
CREATE OR REPLACE FUNCTION calculate_gross_prices()
RETURNS TRIGGER AS $$
BEGIN
  -- VAT rate 23% (1.23 multiplier)
  NEW.price_monthly_gross = ROUND(NEW.price_monthly_net * 1.23);
  NEW.price_yearly_gross = ROUND(NEW.price_yearly_net * 1.23);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Usuń istniejący trigger jeśli istnieje
DROP TRIGGER IF EXISTS calculate_gross_prices_trigger ON subscription_plans;

-- Utwórz trigger który będzie działał przed INSERT i UPDATE
CREATE TRIGGER calculate_gross_prices_trigger
  BEFORE INSERT OR UPDATE OF price_monthly_net, price_yearly_net
  ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION calculate_gross_prices();

-- Aktualizuj istniejące rekordy (jeśli są)
UPDATE subscription_plans 
SET 
  price_monthly_gross = ROUND(price_monthly_net * 1.23),
  price_yearly_gross = ROUND(price_yearly_net * 1.23)
WHERE price_monthly_net IS NOT NULL AND price_yearly_net IS NOT NULL;