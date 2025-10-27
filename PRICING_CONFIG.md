# 💰 Centralna Konfiguracja Cen Planów Subskrypcji

## 📋 Przegląd

Plik `lib/pricing/plans.ts` zawiera centralną konfigurację wszystkich cen planów subskrypcji w aplikacji Monitor Wizaro. Jest to **pojedyncze źródło prawdy** dla wszystkich cen, używane przez:

- ✅ Stronę subskrypcji (`app/subscription/page.tsx`)
- ✅ Konfigurację Stripe (`lib/stripe/config.ts`)
- ✅ Hook useStripe (`hooks/useStripe.ts`)
- ✅ Wszystkie inne komponenty wymagające informacji o cenach

## 🏗️ Struktura

### PlanPricing
```typescript
interface PlanPricing {
  monthly: {
    net: number;    // cena netto w PLN
    gross: number;  // cena brutto w PLN
    grosz: number;  // cena brutto w groszach (dla Stripe)
  };
  yearly: {
    net: number;    // cena netto w PLN
    gross: number;  // cena brutto w PLN  
    grosz: number;  // cena brutto w groszach (dla Stripe)
  };
}
```

### PlanDetails
Zawiera pełne informacje o planie:
- Ceny (PlanPricing)
- Metadane (nazwa, opis)
- Limity i funkcje
- Zniżki i oszczędności

## 💵 Obecne Ceny

### Plan Basic
- **Miesięcznie**: 799 PLN brutto (649.59 PLN netto)
- **Rocznie**: 6,988 PLN brutto (5,680 PLN netto)

### Plan Professional  
- **Miesięcznie**: 1,299 PLN brutto (999 PLN netto)
- **Rocznie**: 12,290 PLN brutto (999 PLN netto)

### Plan Enterprise
- **Miesięcznie**: 491 PLN brutto (399 PLN netto)
- **Rocznie**: 4,908 PLN brutto (3,990 PLN netto)

## 🔧 Jak używać

### W komponencie React:
```typescript
import { getSubscriptionPlans, getPlanDetails } from '@/lib/pricing/plans';

// Pobierz wszystkie plany
const plans = getSubscriptionPlans();

// Pobierz szczegóły konkretnego planu
const basicPlan = getPlanDetails('basic');
```

### W konfiguracji Stripe:
```typescript
import { PLAN_PRICING } from '@/lib/pricing/plans';

const amount = PLAN_PRICING.basic.monthly.grosz; // 79900
```

### W hook'ach:
```typescript
import { PLAN_PRICING } from '@/lib/pricing/plans';

const PLAN_PRICES = {
  basic: { 
    monthly: PLAN_PRICING.basic.monthly.grosz, 
    yearly: PLAN_PRICING.basic.yearly.grosz 
  },
  // ...
};
```

## ✏️ Aktualizacja Cen

**WAŻNE**: Aby zmienić ceny, edytuj TYLKO plik `lib/pricing/plans.ts`. Zmiany automatycznie propagują się do wszystkich części aplikacji.

### Przykład zmiany ceny:
```typescript
// W lib/pricing/plans.ts
export const PLAN_PRICING: Record<string, PlanPricing> = {
  basic: {
    monthly: {
      net: 699.59,    // ← ZMIANA
      gross: 859,     // ← ZMIANA
      grosz: 85900    // ← ZMIANA (gross * 100)
    },
    // ...
  }
};
```

## 🧪 Testowanie

Po zmianie cen przetestuj:
1. ✅ Wyświetlanie cen na stronie subskrypcji
2. ✅ Tworzenie sesji Stripe z poprawnymi kwotami
3. ✅ Kompatybilność z istniejącymi subskrypcjami

## 🚀 Korzyści Centralizacji

- **Spójność**: Jedna cena w całej aplikacji
- **Łatwość zmian**: Jedna edycja = zmiana wszędzie
- **Bezpieczeństwo**: Brak rozbieżności między komponentami
- **Czytelność**: Jasne źródło wszystkich cen
- **Skalowanie**: Łatwe dodawanie nowych planów

---

**Pamiętaj**: Nigdy nie definiuj cen planów bezpośrednio w komponentach! Zawsze używaj centralnej konfiguracji z `lib/pricing/plans.ts`.