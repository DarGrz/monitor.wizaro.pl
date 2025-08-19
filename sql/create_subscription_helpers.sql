-- Najpierw sprawdź czy wymagane tabele istnieją
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
    RAISE EXCEPTION 'Table subscription_plans does not exist. Run create_subscriptions.sql first.';
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    RAISE EXCEPTION 'Table user_subscriptions does not exist. Run create_subscriptions.sql first.';
  END IF;
END $$;

-- Funkcja pomocnicza update_updated_at_column (jeśli jeszcze nie istnieje)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Widok do obliczania dostępnych limitów dla użytkowników
CREATE OR REPLACE VIEW user_subscription_limits AS
SELECT 
  us.id as subscription_id,
  us.user_id,
  us.status as subscription_status,
  
  -- Informacje o planie
  sp.name as plan_name,
  sp.display_name as plan_display_name,
  sp.max_companies,
  sp.max_opinion_removals_monthly,
  sp.additional_services_discount_percent,
  
  -- Wykorzystanie w bieżącym okresie
  us.used_opinion_removals,
  us.current_period_start,
  us.current_period_end,
  
  -- Dostępne limity
  (sp.max_opinion_removals_monthly - COALESCE(us.used_opinion_removals, 0)) as available_opinion_removals,
  
  -- Sprawdzenie czy okres jest aktualny
  (us.current_period_start <= NOW() AND us.current_period_end >= NOW()) as is_current_period,
  
  -- Czy subskrypcja jest aktywna
  (us.status = 'active' AND us.expires_at > NOW()) as is_active
  
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status IN ('active', 'pending');

-- Komentarz
COMMENT ON VIEW user_subscription_limits IS 'Widok pokazujący dostępne limity dla aktywnych subskrypcji użytkowników';

-- Funkcja do resetowania miesięcznych limitów (do uruchamiania cron-em)
CREATE OR REPLACE FUNCTION reset_monthly_limits()
RETURNS void AS $$
BEGIN
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

-- Funkcja do sprawdzania czy użytkownik może wykorzystać usługę z abonamentu
CREATE OR REPLACE FUNCTION can_use_subscription_service(
  p_user_id UUID,
  p_service_type VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
  available_count INTEGER;
  is_active BOOLEAN;
BEGIN
  -- Sprawdź dostępne limity dla użytkownika
  SELECT 
    available_opinion_removals,
    is_active
  INTO available_count, is_active
  FROM user_subscription_limits
  WHERE user_id = p_user_id
    AND subscription_status = 'active';
  
  -- Jeśli nie ma aktywnej subskrypcji
  IF NOT FOUND OR NOT is_active THEN
    RETURN FALSE;
  END IF;
  
  -- Sprawdź czy ma dostępne limity dla danego typu usługi
  CASE p_service_type
    WHEN 'opinion_removal' THEN
      RETURN available_count > 0;
    ELSE
      -- Dla innych usług sprawdź czy ma subskrypcję (niezależnie od limitów)
      RETURN TRUE;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Funkcja do obliczania ceny ze zniżką abonamentową
CREATE OR REPLACE FUNCTION calculate_discounted_price(
  p_user_id UUID,
  p_original_price_net DECIMAL(10,2),
  p_original_price_gross DECIMAL(10,2)
)
RETURNS TABLE(
  discounted_price_net DECIMAL(10,2),
  discounted_price_gross DECIMAL(10,2),
  discount_percent DECIMAL(5,2)
) AS $$
DECLARE
  user_discount DECIMAL(5,2) := 0;
BEGIN
  -- Pobierz zniżkę użytkownika z aktywnego abonamentu
  SELECT sp.additional_services_discount_percent
  INTO user_discount
  FROM user_subscription_limits usl
  JOIN subscription_plans sp ON sp.name = usl.plan_name
  WHERE usl.user_id = p_user_id
    AND usl.is_active = TRUE
  LIMIT 1;
  
  -- Jeśli nie ma zniżki, zwróć oryginalne ceny
  IF user_discount IS NULL OR user_discount = 0 THEN
    RETURN QUERY SELECT p_original_price_net, p_original_price_gross, 0::DECIMAL(5,2);
  ELSE
    -- Oblicz ceny ze zniżką
    RETURN QUERY SELECT 
      ROUND(p_original_price_net * (100 - user_discount) / 100, 2),
      ROUND(p_original_price_gross * (100 - user_discount) / 100, 2),
      user_discount;
  END IF;
END;
$$ LANGUAGE plpgsql;
