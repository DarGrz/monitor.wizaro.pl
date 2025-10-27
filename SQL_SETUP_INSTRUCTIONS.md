# Instrukcja Uruchomienia Systemu Cenowego

## Kolejność wykonywania skryptów SQL w Supabase

### 1. Utwórz tabelę i kolumny
```sql
-- Uruchom w SQL Editor w Supabase:
-- Plik: sql/subscription_plans.sql
```
Ten skrypt:
- Tworzy tabelę `subscription_plans` jeśli nie istnieje
- Dodaje wszystkie potrzebne kolumny bezpiecznie (jeśli nie istnieją)
- Ustawia indeksy i RLS policies

### 2. Dodaj trigger do automatycznego obliczania cen brutto
```sql
-- Uruchom w SQL Editor w Supabase:
-- Plik: sql/auto_calculate_gross_prices.sql
```
Ten skrypt:
- Tworzy funkcję `calculate_gross_prices()`
- Dodaje trigger obliczający ceny brutto (netto × 1.23)
- Aktualizuje istniejące rekordy

### 3. Test podstawowy
```sql
-- Uruchom w SQL Editor w Supabase:
-- Plik: sql/test_basic_plan.sql
```
Ten skrypt:
- Sprawdza strukturę tabeli
- Dodaje plan testowy
- Weryfikuje czy trigger działa

### 4. Dodaj właściwe plany
```sql
-- Uruchom w SQL Editor w Supabase:
-- Plik: sql/subscription_plans.sql (sekcja INSERT na końcu pliku)
```
Ten skrypt dodaje domyślne plany: basic, professional, enterprise

### 5. Opcjonalnie - przykłady zarządzania
```sql
-- Plik: sql/examples_plan_management.sql
-- (przykłady dodawania/modyfikowania planów)
```

## Sprawdzenie czy wszystko działa

Po uruchomieniu wszystkich skryptów wykonaj:

```sql
SELECT 
  id, 
  name,
  display_name,
  price_monthly_net/100.0 as monthly_net_pln,
  price_monthly_gross/100.0 as monthly_gross_pln,
  price_yearly_net/100.0 as yearly_net_pln,
  price_yearly_gross/100.0 as yearly_gross_pln,
  ROUND((price_monthly_gross::decimal / price_monthly_net - 1) * 100, 2) as vat_percent,
  is_active,
  display_order
FROM subscription_plans 
WHERE is_active = true
ORDER BY display_order;
```

Powinieneś zobaczyć plany z automatycznie obliczonymi cenami brutto (VAT 23%).

## Rozwiązywanie problemów

### Błąd "column does not exist"
1. Upewnij się, że uruchomiłeś `subscription_plans.sql` PRZED innymi skryptami
2. Sprawdź strukturę tabeli: 
   ```sql
   \d subscription_plans
   ```

### Ceny brutto nie obliczają się
1. Sprawdź czy trigger istnieje:
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'calculate_gross_prices_trigger';
   ```
2. Uruchom ponownie `auto_calculate_gross_prices.sql`

### Brak planów w aplikacji
1. Sprawdź RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'subscription_plans';
   ```
2. Sprawdź czy plany są aktywne:
   ```sql
   SELECT * FROM subscription_plans WHERE is_active = true;
   ```