# Integracja Stripe - Instrukcja wdrożenia

## ✅ Utworzona struktura

```
📁 app/api/stripe/
├── 📄 webhook/route.ts                 # Endpoint webhook'ów Stripe
├── 📄 create-checkout-session/route.ts # Tworzenie sesji płatności
├── 📄 create-portal-session/route.ts  # Portal zarządzania płatnościami
├── 📄 subscription/route.ts           # API subskrypcji
└── 📄 payments/route.ts               # Historia płatności

📁 lib/stripe/
├── 📄 config.ts                       # Konfiguracja Stripe SDK
├── 📄 webhook-handlers.ts             # Obsługa webhook'ów
└── 📄 utils.ts                        # Funkcje pomocnicze

📁 types/stripe/
└── 📄 index.ts                        # Typy TypeScript

📁 components/
└── 📄 StripePayment.tsx               # Komponent React

📁 hooks/
└── 📄 useStripe.ts                    # Hook React

📁 sql/
└── 📄 stripe_integration.sql          # Skrypt SQL

📁 scripts/
└── 📄 sync-stripe.ts                  # Skrypt synchronizacji

📄 .env.local.example                  # Przykładowe zmienne środowiskowe
📄 STRIPE_INTEGRATION.md               # Dokumentacja
```

## 🚀 Kroki wdrożenia

### 1. Zainstaluj zależności
```bash
npm install stripe
npm install -D tsx
```

### 2. Konfiguracja zmiennych środowiskowych
```bash
# Skopiuj plik przykładowy
cp .env.local.example .env.local

# Edytuj .env.local i wypełnij:
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Uruchom skrypty SQL

#### a) Najpierw utwórz podstawowe tabele (jeśli nie istnieją):
```sql
-- Uruchom w Supabase SQL Editor w tej kolejności:
-- 1. sql/create_users.sql
-- 2. sql/create_subscriptions.sql
-- 3. sql/create_billing_information.sql
```

#### b) Następnie uruchom integrację Stripe:
```sql
-- Uruchom w Supabase SQL Editor:
-- sql/stripe_integration.sql
```

**Ważne:** Upewnij się, że tabele `users`, `subscription_plans` i `user_subscriptions` już istnieją przed uruchomieniem `stripe_integration.sql`.

### 4. Konfiguracja Stripe Dashboard

#### a) Utwórz webhook endpoint:
1. Przejdź do [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Kliknij "Add endpoint"
3. URL: `https://twoja-domena.com/api/stripe/webhook`
4. Wybierz eventy:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
   - `customer.created`
5. Skopiuj webhook secret do `.env.local`

#### b) Utwórz produkty i ceny:
```bash
# Automatycznie zsynchronizuj plany z Stripe:
npm run stripe:sync

# Lub pełna synchronizacja + czyszczenie:
npm run stripe:full
```

### 5. Testowanie lokalne

#### a) Testowanie webhook'ów lokalnie:
```bash
# Zainstaluj Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook

# W drugim terminalu uruchom aplikację:
npm run dev
```

#### b) Test płatności:
- Użyj kart testowych Stripe:
  - Udana: `4242 4242 4242 4242`
  - Nieudana: `4000 0000 0000 0002`

### 6. Aktualizacja kodu aplikacji

#### a) Zaktualizuj stronę subskrypcji:
Strona `/subscription` została już zaktualizowana o komponent `StripePayment`.

#### b) Dodaj ID planów Stripe:
Po utworzeniu produktów w Stripe, zaktualizuj mapowanie w komponencie:
```typescript
// W app/subscription/page.tsx
stripePriceId: `price_${plan.id}_${billingCycle}`, // Zastąp rzeczywistymi ID
```

#### c) Dodaj obsługę sukcesu/błędu:
```typescript
// Obsługa parametrów URL po powrocie ze Stripe
const searchParams = useSearchParams();
const success = searchParams.get('success');
const canceled = searchParams.get('canceled');
```

## 📋 Dostępne skrypty

```bash
# Synchronizacja planów z Stripe
npm run stripe:sync

# Czyszczenie nieużywanych produktów
npm run stripe:cleanup

# Pełna synchronizacja
npm run stripe:full
```

## 🔧 Konfiguracja produkcyjna

### 1. Zmienne środowiskowe produkcyjne:
```bash
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Webhook endpoint produkcyjny:
- URL: `https://monitor.wizaro.pl/api/stripe/webhook`
- Upewnij się, że endpoint jest dostępny publicznie

### 3. SSL/HTTPS:
- Stripe wymaga HTTPS dla webhook'ów w produkcji

## 🔒 Bezpieczeństwo

- ✅ Weryfikacja sygnatur webhook'ów
- ✅ Autoryzacja użytkowników
- ✅ Szyfrowanie zmiennych środowiskowych
- ✅ Metadane użytkowników w Stripe
- ✅ RLS policies w Supabase

## 📊 Monitoring i logi

### Stripe Dashboard:
- [Events](https://dashboard.stripe.com/events) - historia webhook'ów
- [Logs](https://dashboard.stripe.com/logs) - logi API
- [Customers](https://dashboard.stripe.com/customers) - klienci

### Aplikacja:
- Logi webhook'ów w konsoli serwera
- Błędy zapisywane w console.error

## 🚨 Rozwiązywanie problemów

### Webhook'i nie działają:
1. Sprawdź czy endpoint jest dostępny: `curl https://twoja-domena.com/api/stripe/webhook`
2. Sprawdź logi w Stripe Dashboard > Events
3. Sprawdź czy `STRIPE_WEBHOOK_SECRET` jest poprawny

### Błędy bazy danych:
1. Sprawdź czy tabele zostały utworzone: `sql/stripe_integration.sql`
2. Sprawdź uprawnienia RLS w Supabase
3. Sprawdź czy `SUPABASE_SERVICE_ROLE_KEY` ma odpowiednie uprawnienia

### Błędy płatności:
1. Sprawdź czy klucze Stripe są poprawne
2. Sprawdź czy produkty/ceny istnieją w Stripe
3. Sprawdź logi w Stripe Dashboard > Logs

## 📞 Wsparcie

W razie problemów:
1. Sprawdź dokumentację Stripe: https://stripe.com/docs
2. Sprawdź logi w aplikacji i Stripe Dashboard
3. Przetestuj na środowisku testowym

## 🎉 Gotowe!

Po wykonaniu wszystkich kroków integracja Stripe będzie gotowa do użycia. Użytkownicy będą mogli:

- 💳 Dokonywać płatności przez Stripe Checkout
- 📧 Otrzymywać faktury automatycznie
- ⚙️ Zarządzać subskrypcjami przez Customer Portal
- 📊 Monitorować status płatności w aplikacji
