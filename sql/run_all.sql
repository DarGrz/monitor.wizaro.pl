-- Skrypt do uruchomienia wszystkich migracji bazy danych
-- UWAGA: Uruchamiaj w podanej kolejności!

-- Sprawdź połączenie z bazą
SELECT 'Database connection OK' as status, NOW() as timestamp;

-- 1. Tworzenie użytkowników (zawiera funkcję update_updated_at_column)
\echo 'Creating users table...'
\i create_users.sql

-- 2. Tworzenie firm użytkowników  
\echo 'Creating user_companies table...'
\i create_user_companies.sql

-- 3. Tworzenie danych rozliczeniowych
\echo 'Creating billing_information table...'
\i create_billing_information.sql

-- 4. Tworzenie planów subskrypcji i subskrypcji użytkowników
\echo 'Creating subscription tables...'
\i create_subscriptions.sql

-- 5. Tworzenie usług jednorazowych
\echo 'Creating services tables...'
\i create_services.sql

-- 6. Funkcje pomocnicze dla subskrypcji (wymaga wcześniejszych tabel)
\echo 'Creating subscription helper functions and views...'
\i create_subscription_helpers.sql

-- Sprawdzenie czy wszystkie tabele zostały utworzone
\echo 'Verifying all tables were created...'
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'users', 
    'user_companies', 
    'billing_information', 
    'subscription_plans', 
    'user_subscriptions', 
    'subscription_usage',
    'payment_history', 
    'services', 
    'service_orders'
  )
ORDER BY tablename;

-- Sprawdzenie czy widok został utworzony
\echo 'Verifying views were created...'
SELECT viewname FROM pg_views WHERE viewname = 'user_subscription_limits';

-- Sprawdzenie czy funkcje zostały utworzone
\echo 'Verifying functions were created...'
SELECT proname FROM pg_proc WHERE proname IN (
  'update_updated_at_column',
  'reset_monthly_limits', 
  'can_use_subscription_service',
  'calculate_discounted_price'
);

\echo 'Database setup completed!';
