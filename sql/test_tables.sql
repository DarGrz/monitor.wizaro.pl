-- Test obecności i struktury tabel subskrypcji

-- Sprawdź czy tabela subscription_plans istnieje i ma odpowiednie kolumny
DO $$
BEGIN
  -- Sprawdź istnienie tabeli
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
    RAISE NOTICE 'ERROR: Table subscription_plans does not exist!';
    RAISE NOTICE 'Solution: Run create_subscriptions.sql first';
    RETURN;
  END IF;
  
  -- Sprawdź istnienie kolumny max_opinion_removals_monthly
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'subscription_plans' 
    AND column_name = 'max_opinion_removals_monthly'
  ) THEN
    RAISE NOTICE 'ERROR: Column max_opinion_removals_monthly does not exist in subscription_plans!';
    RAISE NOTICE 'Current columns in subscription_plans:';
    -- Lista obecnych kolumn zostanie pokazana poniżej
  ELSE
    RAISE NOTICE 'SUCCESS: Table subscription_plans exists with correct structure';
  END IF;
END $$;

-- Pokaż wszystkie kolumny w tabeli subscription_plans (jeśli istnieje)
SELECT 
  'subscription_plans columns:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'subscription_plans'
ORDER BY ordinal_position;

-- Sprawdź dane w tabeli (jeśli istnieje)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
    RAISE NOTICE 'Data in subscription_plans:';
    -- Dane będą pokazane w zapytaniu poniżej
  END IF;
END $$;

-- Pokaż istniejące plany (jeśli tabela istnieje)
SELECT 
  name,
  display_name,
  max_opinion_removals_monthly,
  additional_services_discount_percent
FROM subscription_plans 
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription_plans');
