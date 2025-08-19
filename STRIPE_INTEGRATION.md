# Integracja Stripe - Dokumentacja

## Struktura folderów

```
app/api/stripe/
├── webhook/route.ts                 # Endpoint do obsługi webhook'ów Stripe
├── create-checkout-session/route.ts # Tworzenie sesji checkout
├── create-portal-session/route.ts  # Tworzenie sesji Customer Portal
└── subscription/route.ts           # Pobieranie informacji o subskrypcji

lib/stripe/
├── config.ts                       # Konfiguracja Stripe
├── webhook-handlers.ts             # Obsługa różnych typów webhook'ów
└── utils.ts                        # Funkcje pomocnicze do API Stripe

types/stripe/
└── index.ts                        # Typy TypeScript dla Stripe

hooks/
└── useStripe.ts                    # React hook do obsługi Stripe
```

## Konfiguracja

### 1. Zmienne środowiskowe

Skopiuj `.env.local.example` do `.env.local` i wypełnij odpowiednie wartości:

```bash
cp .env.local.example .env.local
```

Wypełnij następujące zmienne:
- `STRIPE_SECRET_KEY` - Klucz tajny z Dashboard Stripe
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Klucz publiczny z Dashboard Stripe  
- `STRIPE_WEBHOOK_SECRET` - Secret webhook'a z Dashboard Stripe

### 2. Konfiguracja webhook'a w Stripe

1. Przejdź do [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Kliknij "Add endpoint"
3. Wprowadź URL: `https://twoja-domena.com/api/stripe/webhook`
4. Wybierz następujące eventy:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
   - `customer.created`
5. Skopiuj webhook secret do zmiennej `STRIPE_WEBHOOK_SECRET`

### 3. Struktura bazy danych

Upewnij się, że masz następujące tabele w Supabase:

#### subscriptions
```sql
CREATE TABLE subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    stripe_price_id TEXT,
    stripe_checkout_session_id TEXT,
    status TEXT NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### billing_information
```sql
CREATE TABLE billing_information (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_invoice_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    amount_paid INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Użycie

### 1. Hook useStripe

```tsx
import { useStripe } from '@/hooks/useStripe';

function SubscriptionComponent() {
  const { loading, error, createCheckoutSession, createPortalSession, getSubscription } = useStripe();

  const handleSubscribe = async () => {
    try {
      await createCheckoutSession('price_1234567890'); // ID ceny z Stripe
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleManageBilling = async () => {
    try {
      await createPortalSession();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <button onClick={handleSubscribe} disabled={loading}>
        {loading ? 'Ładowanie...' : 'Subskrybuj'}
      </button>
      
      <button onClick={handleManageBilling} disabled={loading}>
        Zarządzaj płatnościami
      </button>
      
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

### 2. Bezpośrednie użycie API

```tsx
// Tworzenie sesji checkout
const response = await fetch('/api/stripe/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    priceId: 'price_1234567890',
    successUrl: 'https://twoja-domena.com/success',
    cancelUrl: 'https://twoja-domena.com/cancel'
  })
});

// Pobieranie subskrypcji
const subscriptionResponse = await fetch('/api/stripe/subscription');
const { subscription } = await subscriptionResponse.json();
```

### 3. Obsługa webhook'ów

Webhook'i są automatycznie obsługiwane przez endpoint `/api/stripe/webhook`. Obsługiwane eventy:

- **customer.subscription.created** - Tworzy nową subskrypcję w bazie danych
- **customer.subscription.updated** - Aktualizuje istniejącą subskrypcję
- **customer.subscription.deleted** - Oznacza subskrypcję jako anulowaną
- **invoice.payment_succeeded** - Zapisuje udaną płatność
- **invoice.payment_failed** - Zapisuje nieudaną płatność
- **checkout.session.completed** - Łączy sesję checkout z subskrypcją
- **customer.created** - Opcjonalna obsługa nowego klienta

## Testowanie

### 1. Testowanie webhook'ów lokalnie

Użyj Stripe CLI do przekazywania webhook'ów:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 2. Korzystanie z kart testowych Stripe

- **Udana płatność**: 4242 4242 4242 4242
- **Nieudana płatność**: 4000 0000 0000 0002
- **Wymaga 3D Secure**: 4000 0025 0000 3155

## Bezpieczeństwo

1. **Weryfikacja webhook'ów** - Wszystkie webhook'i są weryfikowane przy użyciu sygnatury Stripe
2. **Autoryzacja** - Wszystkie endpoint'y wymagają zalogowanego użytkownika
3. **Metadane** - ID użytkownika jest dodawane do metadanych w Stripe
4. **Zmienne środowiskowe** - Klucze API są przechowywane w zmiennych środowiskowych

## Rozwiązywanie problemów

### Błędy webhook'ów
- Sprawdź czy `STRIPE_WEBHOOK_SECRET` jest poprawnie ustawiony
- Sprawdź czy endpoint webhook'a jest dostępny publicznie
- Sprawdź logi w Dashboard Stripe

### Błędy płatności
- Sprawdź czy `STRIPE_SECRET_KEY` jest poprawny
- Sprawdź czy używasz właściwego środowiska (test/prod)
- Sprawdź logi w terminalu/konsoli
