# System Cenowy - Dokumentacja

## Przegląd

System cenowy w aplikacji bazuje na automatycznym obliczaniu cen brutto na podstawie cen netto z 23% VAT. Wszystkie ceny w bazie danych są przechowywane w groszach dla zachowania precyzji.

## Struktura Bazy Danych

### Tabela `subscription_plans`

```sql
subscription_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Ceny w groszach
  price_monthly_net INTEGER NOT NULL,     -- cena miesięczna netto w groszach
  price_monthly_gross INTEGER NOT NULL,   -- obliczana automatycznie (netto * 1.23)
  price_yearly_net INTEGER NOT NULL,      -- cena roczna netto w groszach  
  price_yearly_gross INTEGER NOT NULL,    -- obliczana automatycznie (netto * 1.23)
  
  currency VARCHAR(3) NOT NULL DEFAULT 'PLN',
  
  -- Funkcjonalności planu
  max_companies INTEGER NOT NULL DEFAULT 1,
  max_opinion_removals_monthly INTEGER NOT NULL DEFAULT 0,
  has_negative_monitoring BOOLEAN NOT NULL DEFAULT true,
  has_weekly_reports BOOLEAN NOT NULL DEFAULT false,
  has_email_notifications BOOLEAN NOT NULL DEFAULT true,
  has_instant_notifications BOOLEAN NOT NULL DEFAULT false,
  additional_services_discount_percent INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Automatyczne Obliczanie Cen Brutto

### Trigger PostgreSQL

System automatycznie oblicza ceny brutto na podstawie cen netto za pomocą triggera:

```sql
-- Funkcja obliczająca ceny brutto z VAT 23%
CREATE OR REPLACE FUNCTION calculate_gross_prices()
RETURNS TRIGGER AS $$
BEGIN
  NEW.price_monthly_gross = ROUND(NEW.price_monthly_net * 1.23);
  NEW.price_yearly_gross = ROUND(NEW.price_yearly_net * 1.23);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger wykonywany przed INSERT/UPDATE
CREATE TRIGGER calculate_gross_prices_trigger
  BEFORE INSERT OR UPDATE OF price_monthly_net, price_yearly_net
  ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION calculate_gross_prices();
```

### Przykład Użycia

```sql
-- Dodanie nowego planu - podaj tylko ceny netto
INSERT INTO subscription_plans (
  id, name, display_name, description,
  price_monthly_net, price_yearly_net,  -- tylko netto!
  max_companies, is_active
) VALUES (
  'premium',
  'premium',
  'Plan Premium',
  'Najlepszy plan dla dużych firm',
  149900,   -- 1499 PLN netto/miesiąc
  1499000,  -- 14990 PLN netto/rok
  999, true
);

-- Wynik: ceny brutto będą automatycznie:
-- price_monthly_gross = 184377 (1843.77 PLN)
-- price_yearly_gross = 18437700 (184377.00 PLN)
```

## Integracja z Aplikacją

### Hook `useSubscriptionPlans`

Hook automatycznie pobiera plany z bazy i konwertuje ceny z groszy na PLN:

```typescript
const { plans, loading, error } = useSubscriptionPlans();

// Plany zawierają ceny w PLN (skonwertowane z groszy):
plans[0].price_monthly_net    // np. 649.59
plans[0].price_monthly_gross  // np. 799.00 (obliczone: 649.59 * 1.23)
plans[0].price_yearly_net     // np. 5680.00
plans[0].price_yearly_gross   // np. 6986.40 (obliczone: 5680 * 1.23)
```

### Strona Subskrypcji

Strona `/subscription` automatycznie pobiera aktualne ceny z bazy:

```typescript
export default function SubscriptionPage() {
  // Pobierz plany z bazy danych
  const { plans: SUBSCRIPTION_PLANS, loading: plansLoading, error: plansError } = useSubscriptionPlans();
  
  // Plany są zawsze aktualne z bazy danych
  return (
    <div>
      {SUBSCRIPTION_PLANS.map((plan) => (
        <div key={plan.id}>
          <h3>{plan.display_name}</h3>
          <p>Miesięcznie: {plan.price_monthly_gross.toFixed(0)} PLN</p>
          <p>Rocznie: {plan.price_yearly_gross.toFixed(0)} PLN</p>
        </div>
      ))}
    </div>
  );
}
```

### API Stripe

API automatycznie pobiera aktualne ceny z bazy:

```typescript
// app/api/stripe/subscription/route.ts
export async function POST(request: NextRequest) {
  // Pobierz szczegóły planu z bazy danych
  const { data: planData, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .eq('is_active', true)
    .single();

  // Użyj ceny z bazy (w groszach)
  const amount = billingCycle === 'monthly' 
    ? planData.price_monthly_gross 
    : planData.price_yearly_gross;
    
  // Przekaż do Stripe...
}
```

## Zalety Systemu

### 1. **Centralność**
- Wszystkie ceny w jednym miejscu (baza danych)
- Automatyczna synchronizacja między wszystkimi komponentami
- Brak duplikacji cen w kodzie

### 2. **Automatyzacja**
- Ceny brutto obliczane automatycznie
- Nie ma ryzyka błędów w obliczeniach VAT
- Konsystentne stawki podatkowe

### 3. **Łatwość Zarządzania**
- Zmiana ceny wymaga tylko aktualizacji ceny netto
- Nie trzeba pamiętać o przeliczaniu VAT
- Możliwość łatwej zmiany stawki VAT w przyszłości

### 4. **Precyzja**
- Ceny w groszach zapobiegają błędom zaokrągleń
- Dokładne obliczenia finansowe
- Kompatybilność z systemami płatniczymi

## Przykłady Zarządzania Cenami

### Dodanie Nowego Planu
```sql
INSERT INTO subscription_plans (
  id, name, display_name,
  price_monthly_net, price_yearly_net,
  max_companies, is_active
) VALUES (
  'startup', 'startup', 'Plan Startup',
  29900,   -- 299 PLN netto/miesiąc → 367.77 PLN brutto
  299000,  -- 2990 PLN netto/rok → 3677.70 PLN brutto
  3, true
);
```

### Aktualizacja Cen
```sql
UPDATE subscription_plans 
SET price_monthly_net = 79900  -- 799 PLN netto → 982.77 PLN brutto
WHERE id = 'basic';
```

### Sprawdzenie Aktualnych Cen
```sql
SELECT 
  name,
  price_monthly_net/100.0 as monthly_net_pln,
  price_monthly_gross/100.0 as monthly_gross_pln,
  ROUND(price_monthly_gross::decimal / price_monthly_net * 100 - 100, 2) as vat_percent
FROM subscription_plans 
WHERE is_active = true
ORDER BY display_order;
```

## Migracja z Poprzedniego Systemu

Jeśli masz istniejące plany w plikach konfiguracyjnych, możesz je zmigrować:

```sql
-- Przykład migracji z pliku config
UPDATE subscription_plans SET price_monthly_net = 64959 WHERE id = 'basic';
UPDATE subscription_plans SET price_monthly_net = 99900 WHERE id = 'professional';
UPDATE subscription_plans SET price_monthly_net = 39900 WHERE id = 'enterprise';
```

Ceny brutto zostaną automatycznie przeliczone przez trigger.