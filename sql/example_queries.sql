-- Przykładowe zapytania do testowania systemu subskrypcji monitor.wizaro.pl

-- 1. Sprawdzenie dostępnych planów subskrypcji
SELECT 
  name,
  display_name,
  price_monthly_net as "Cena miesięczna netto (PLN)",
  price_monthly_gross as "Cena miesięczna brutto (PLN)",
  max_companies as "Max firm",
  max_opinion_removals_monthly as "Darmowe usunięcia/miesiąc",
  additional_services_discount_percent as "Zniżka na dodatkowe usługi (%)",
  estimated_monthly_savings as "Szacunkowe oszczędności (PLN)"
FROM subscription_plans 
WHERE is_active = TRUE
ORDER BY price_monthly_net;

-- 2. Sprawdzenie dostępnych usług jednorazowych
SELECT 
  display_name as "Usługa",
  price_net as "Cena netto (PLN)",
  price_gross as "Cena brutto (PLN)",
  category as "Kategoria"
FROM services 
WHERE is_active = TRUE
ORDER BY price_gross;

-- 3. Sprawdzenie limitów użytkownika (przykład - wymaga ID użytkownika)
-- SELECT * FROM user_subscription_limits WHERE user_id = 'USER_UUID_HERE';

-- 4. Sprawdzenie czy użytkownik może skorzystać z usługi abonamentowej
-- SELECT can_use_subscription_service('USER_UUID_HERE', 'opinion_removal');

-- 5. Obliczenie ceny ze zniżką abonamentową dla użytkownika
-- SELECT * FROM calculate_discounted_price('USER_UUID_HERE', 243.09, 299.00);

-- 6. Historia płatności użytkownika
-- SELECT 
--   ph.payment_date,
--   ph.description,
--   ph.amount_net,
--   ph.amount_gross,
--   ph.status,
--   ph.payment_method
-- FROM payment_history ph
-- WHERE ph.user_id = 'USER_UUID_HERE'
-- ORDER BY ph.payment_date DESC;

-- 7. Aktywne subskrypcje z limiatami
SELECT 
  u.email,
  usl.plan_display_name,
  usl.available_opinion_removals as "Dostępne usunięcia opinii",
  usl.current_period_end as "Koniec okresu",
  usl.is_active as "Aktywna"
FROM user_subscription_limits usl
JOIN users u ON usl.user_id = u.id
WHERE usl.is_active = TRUE;

-- 8. Statystyki wykorzystania planów
SELECT 
  sp.display_name,
  COUNT(us.id) as "Liczba aktywnych subskrypcji",
  AVG(us.used_opinion_removals) as "Średnie wykorzystanie usunięć",
  SUM(us.amount_paid_gross) as "Łączne przychody brutto"
FROM subscription_plans sp
LEFT JOIN user_subscriptions us ON sp.id = us.plan_id AND us.status = 'active'
GROUP BY sp.id, sp.display_name
ORDER BY sp.price_monthly_net;

-- 9. Przychody z usług jednorazowych (ostatnie 30 dni)
SELECT 
  s.display_name,
  COUNT(so.id) as "Liczba zamówień",
  SUM(so.total_price_gross) as "Łączne przychody brutto"
FROM services s
LEFT JOIN service_orders so ON s.id = so.service_id 
  AND so.status = 'completed' 
  AND so.completed_at > NOW() - INTERVAL '30 days'
GROUP BY s.id, s.display_name
ORDER BY SUM(so.total_price_gross) DESC NULLS LAST;

-- 10. Wygasające subskrypcje (następne 7 dni)
SELECT 
  u.email,
  sp.display_name as plan,
  us.expires_at as "Data wygaśnięcia",
  (us.expires_at - NOW()) as "Pozostały czas"
FROM user_subscriptions us
JOIN users u ON us.user_id = u.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active' 
  AND us.expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY us.expires_at;
