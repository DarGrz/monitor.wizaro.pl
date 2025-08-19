-- Funkcje pomocnicze które można uruchomić niezależnie od tabel

-- Funkcja do aktualizacji updated_at (potrzebna dla triggerów)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funkcja do resetowania miesięcznych limitów (wymaga tabel)
-- Będzie działać tylko po utworzeniu user_subscriptions
CREATE OR REPLACE FUNCTION reset_monthly_limits()
RETURNS void AS $$
BEGIN
  -- Sprawdź czy tabela user_subscriptions istnieje
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    RAISE NOTICE 'Table user_subscriptions does not exist yet';
    RETURN;
  END IF;

  -- Reset limitów dla subskrypcji, których okres się skończył
  UPDATE user_subscriptions 
  SET 
    used_opinion_removals = 0,
    current_period_start = current_period_end,
    current_period_end = CASE 
      WHEN billing_cycle = 'monthly' THEN current_period_end + INTERVAL '1 month'
      WHEN billing_cycle = 'yearly' THEN current_period_end + INTERVAL '1 year'
      ELSE current_period_end + INTERVAL '1 month'
    END,
    updated_at = NOW()
  WHERE 
    status = 'active' 
    AND current_period_end < NOW();
    
  -- Log operacji
  RAISE NOTICE 'Monthly limits reset completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Test funkcji
SELECT 'Functions created successfully' as status;
