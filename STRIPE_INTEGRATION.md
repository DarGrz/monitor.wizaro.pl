# 💳 Integracja Stripe dla Płatności Rekurencyjnych - Monitor Wizaro

## 🎯 Przegląd

Ta implementacja zastępuje system PayU płatnościami rekurencyjnymi Stripe w aplikacji Monitor Wizaro. Zachowuje kompatybilność z obecną strukturą bazy danych i interfejsami użytkownika.

## 🛠️ Zaimplementowane Komponenty

### 1. Konfiguracja Stripe
- `lib/stripe/config.ts` - Podstawowa konfiguracja, mapowanie planów
- `lib/stripe/utils.ts` - Funkcje pomocnicze dla operacji Stripe

### 2. API Endpoints
- `app/api/stripe/subscription/route.ts` - Tworzenie subskrypcji
- `app/api/stripe/webhook/route.ts` - Obsługa webhooków Stripe  
- `app/api/stripe/customer-portal/route.ts` - Portal zarządzania subskrypcją
- `app/api/stripe/session-details/route.ts` - Szczegóły sesji dla strony sukcesu

### 3. Frontend
- `hooks/useStripe.ts` - Hook do zarządzania subskrypcjami (zachowuje kompatybilność z usePayU)
- `app/subscription/page.tsx` - Zaktualizowana strona subskrypcji (zmieniony endpoint na Stripe)
- `app/subscription/success/page.tsx` - Strona sukcesu po subskrypcji

## 📋 Wymagane Zmienne Środowiskowe

Dodaj do pliku `.env.local`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...  # lub sk_test_... dla testów
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # lub pk_test_... dla testów
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe VAT Rate ID (opcjonalne - dla polskiego VAT 23%)
STRIPE_VAT_RATE_ID=txr_1PLACEHOLDER  # Zastąp prawdziwym ID po utworzeniu

# Stripe Price IDs dla planów subskrypcji (utworzysz w Stripe Dashboard)
STRIPE_BASIC_MONTHLY_PRICE_ID=price_basic_monthly_placeholder
STRIPE_BASIC_YEARLY_PRICE_ID=price_basic_yearly_placeholder
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_professional_monthly_placeholder
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=price_professional_yearly_placeholder
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_enterprise_monthly_placeholder
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_enterprise_yearly_placeholder

# Existing variables (zachowaj istniejące)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## 🚀 Kroki Wdrożenia

### 1. Konfiguracja Stripe Dashboard

#### Produkty i Ceny
Utwórz produkty i ceny w Stripe Dashboard:

1. **Basic Plan**
   - Produkt: "Monitor Wizaro - Basic"
   - Cena miesięczna: 799.00 PLN
   - Cena roczna: 6988.00 PLN (oszczędność ~27%)

2. **Professional Plan**
   - Produkt: "Monitor Wizaro - Professional" 
   - Cena miesięczna: 1299.00 PLN
   - Cena roczna: 12290.00 PLN

3. **Enterprise Plan**
   - Produkt: "Monitor Wizaro - Enterprise"
   - Cena miesięczna: 491.00 PLN
   - Cena roczna: 4908.00 PLN

#### Tax Rate (VAT)
Utwórz tax rate dla polskiego VAT:
- Nazwa: "Polish VAT 23%"
- Stawka: 23%
- Kraj: Poland
- Skopiuj ID i wstaw do `STRIPE_VAT_RATE_ID`

### 2. Webhook Configuration

1. W Stripe Dashboard przejdź do **Webhooks**
2. Dodaj endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Wybierz eventy:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
4. Skopiuj **Webhook Secret** do `STRIPE_WEBHOOK_SECRET`

### 3. Aktualizacja Bazy Danych

Obecna struktura tabeli `user_subscriptions` jest kompatybilna. Dodaj opcjonalne kolumny:

```sql
-- Dodaj kolumny dla Stripe (jeśli nie istnieją)
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Indeksy dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id ON user_subscriptions(stripe_customer_id);
```

### 4. Testowanie

#### Testowe karty Stripe:
```
# Sukces
4242 4242 4242 4242

# Odrzucona karta
4000 0000 0000 0002

# Wymaga uwierzytelnienia 3D Secure
4000 0025 0000 3155

# Polskie karty (BLIK)
Użyj test environment w Stripe dla polskich metod płatności
```

#### Testowanie webhook lokalnie:
```bash
# Zainstaluj Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook

# W drugim terminalu - testuj eventy
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

## 🔄 Migracja z PayU

### Stopniowa migracja:
1. **Faza 1**: Wdróż Stripe jako dodatkową opcję płatności
2. **Faza 2**: Przekieruj nowych użytkowników na Stripe
3. **Faza 3**: Migruj istniejące subskrypcje PayU (opcjonalnie)

### Kompatybilność:
- Hook `useStripe` eksportuje się również jako `usePayU` dla zachowania kompatybilności
- Struktura danych w bazie pozostaje niezmieniona
- API endpointy zachowują podobną strukturę odpowiedzi

## 📊 Monitorowanie

### Metryki do śledzenia:
- Współczynnik konwersji subskrypcji
- Churn rate (wskaźnik rezygnacji)
- Revenue growth
- Trial to paid conversion

### Logowanie:
Wszystkie operacje są logowane w konsoli z prefiksami:
- `✅` - Operacje pomyślne
- `❌` - Błędy
- `⚠️` - Ostrzeżenia
- `ℹ️` - Informacje

## 🛡️ Bezpieczeństwo

### Zaimplementowane zabezpieczenia:
- Weryfikacja webhook signature
- Walidacja danych wejściowych
- Bezpieczne przechowywanie kluczy API
- RLS (Row Level Security) w Supabase
- Zabezpieczenie przed duplikacją subskrypcji

### Najlepsze praktyki:
- Używaj HTTPS w production
- Regularnie rotuj klucze API
- Monitoruj podejrzane transakcje
- Implementuj rate limiting

## 🆘 Troubleshooting

### Częste problemy:

1. **Błąd weryfikacji webhook**
   - Sprawdź `STRIPE_WEBHOOK_SECRET`
   - Upewnij się, że endpoint jest dostępny publicznie

2. **Brak Price ID**
   - Utwórz produkty i ceny w Stripe Dashboard
   - Zaktualizuj zmienne środowiskowe

3. **Błędy VAT**
   - Sprawdź `STRIPE_VAT_RATE_ID`
   - Upewnij się, że tax rate jest aktywny

4. **Problemy z bazą danych**
   - Sprawdź uprawnienia RLS
   - Zweryfikuj strukturę tabel

### Logi do sprawdzenia:
- Browser Console (błędy frontend)
- Server Logs (błędy API)
- Stripe Dashboard > Logs (problemy z płatnościami)
- Supabase Dashboard > Logs (problemy z bazą danych)

## 🎉 Gotowe!

Po wykonaniu powyższych kroków, aplikacja będzie używać Stripe dla płatności rekurencyjnych zamiast PayU, zachowując pełną funkcjonalność i kompatybilność z obecną strukturą.

---

*Implementacja utworzona: 2025*  
*Kompatybilna z: Stripe API 2024-06-20, Next.js 15, Supabase*