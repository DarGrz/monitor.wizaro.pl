# Konfiguracja PayU - Integracja zgodna z dokumentacją PayU

## Przegląd zmian

Aplikacja została zaktualizowana, aby być w pełni zgodna z oficjalną dokumentacją PayU API v2.1. Implementacja obejmuje:

### 1. Uwierzytelnianie OAuth
- ✅ Zgodne URL-e OAuth dla sandbox i produkcji
- ✅ Prawidłowe nagłówki `Content-Type: application/x-www-form-urlencoded`
- ✅ Obsługa błędów zgodnie z dokumentacją (401, 400, etc.)
- ✅ Walidacja odpowiedzi i tokena

### 2. Tworzenie zamówień
- ✅ Endpoint API zgodny z dokumentacją: `/api/v2_1/orders`
- ✅ Wszystkie wymagane pola zgodnie z PayU API
- ✅ Obsługa specyficznych błędów PayU (ERROR_VALUE_INVALID, ERROR_ORDER_NOT_UNIQUE, etc.)
- ✅ Walidacja odpowiedzi z `redirectUri`

### 3. Płatności cykliczne (subskrypcje)
- ✅ Obsługa parametrów `recurring` i `cardOnFile`
- ✅ Pierwszy płatność z `FIRST`, kolejne z `STANDARD`
- ✅ Obsługa błędów specyficznych dla subskrypcji

### 4. Webhook PayU
- ✅ Weryfikacja podpisu `openpayu-signature`
- ✅ Obsługa różnych statusów płatności
- ✅ Graceful handling braku podpisu w sandbox
- ✅ Ulepszone wyszukiwanie zamówień

### 5. Nowe endpointy
- ✅ `/api/payu/subscription` - POST dla tworzenia subskrypcji
- ✅ `/api/payu/status/[orderId]` - GET dla sprawdzania statusu
- ✅ `/api/payu/test` - GET dla testowania konfiguracji

## Zmienne środowiskowe

Dodaj do pliku `.env.local`:

```bash
# Środowisko PayU
PAYU_ENVIRONMENT=sandbox # lub 'production' dla produkcji

# Sandbox PayU (środowisko testowe)
PAYU_SANDBOX_POS_ID=twój_sandbox_pos_id
PAYU_SANDBOX_OAUTH_CLIENT_ID=twój_sandbox_client_id  
PAYU_SANDBOX_OAUTH_CLIENT_SECRET=twój_sandbox_client_secret
PAYU_SANDBOX_LONG_KEY_MD5=twój_sandbox_long_key_md5

# Produkcja PayU (środowisko live)
PAYU_POS_ID=twój_production_pos_id
PAYU_OAUTH_CLIENT_ID=twój_production_client_id
PAYU_OAUTH_CLIENT_SECRET=twój_production_client_secret
PAYU_LONG_KEY_MD5=twój_production_long_key_md5

# URL aplikacji
NEXT_PUBLIC_APP_URL=https://monitor.wizaro.pl
```

## URL-e zgodne z dokumentacją PayU

### Sandbox (testowe)
- OAuth: `https://secure.snd.payu.com/pl/standard/user/oauth/authorize`
- API: `https://secure.snd.payu.com/api/v2_1`
- Orders: `https://secure.snd.payu.com/api/v2_1/orders`

### Produkcja (live)
- OAuth: `https://secure.payu.com/pl/standard/user/oauth/authorize`
- API: `https://secure.payu.com/api/v2_1`
- Orders: `https://secure.payu.com/api/v2_1/orders`

## Testowanie

1. **Test konfiguracji**: `GET /api/payu/test`
   - Sprawdza zmienne środowiskowe
   - Testuje OAuth token
   - Wyświetla URL-e API

2. **Test tworzenia płatności**: `POST /api/payu/create-payment`
3. **Test subskrypcji**: `POST /api/payu/subscription`
4. **Test webhook**: Skonfiguruj URL w panelu PayU

## Statusy płatności PayU

Zgodnie z dokumentacją PayU, obsługiwane statusy:

- `NEW` - Nowe zamówienie
- `PENDING` - Oczekuje na płatność  
- `WAITING_FOR_CONFIRMATION` - Oczekuje na potwierdzenie 3DS
- `COMPLETED` - Płatność zakończona pomyślnie
- `CANCELED` - Płatność anulowana
- `REJECTED` - Płatność odrzucona

## Bezpieczeństwo

1. **TLS 1.2** - Wymagane przez PayU od 2018
2. **SNI (Server Name Indication)** - Wymagane od 2023
3. **Podpis webhook** - Weryfikacja integralności
4. **Walidacja tokenów** - Sprawdzanie ważności OAuth

## Codes błędów PayU

Aplikacja obsługuje wszystkie kody błędów z dokumentacji:

- `400 ERROR_VALUE_INVALID` - Nieprawidłowe dane
- `400 ERROR_VALUE_MISSING` - Brakujące dane
- `400 ERROR_ORDER_NOT_UNIQUE` - Nieunikalny extOrderId
- `401 UNAUTHORIZED` - Błąd autoryzacji
- `403 UNAUTHORIZED_REQUEST` - Brak uprawnień
- `404 DATA_NOT_FOUND` - Nie znaleziono danych
- `500 BUSINESS_ERROR` - Błąd systemowy PayU

## Monitorowanie

Logowanie obejmuje:
- Żądania OAuth z detalami odpowiedzi
- Tworzenie zamówień z pełnymi danymi
- Webhook z weryfikacją podpisu
- Błędy z kodami HTTP i opisami

## Następne kroki

1. Skonfiguruj zmienne środowiskowe
2. Przetestuj endpoint `/api/payu/test`
3. Skonfiguruj webhook URL w panelu PayU
4. Przetestuj płatności w sandbox
5. Przenieś na produkcję zmieniając `PAYU_ENVIRONMENT=production`
