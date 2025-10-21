# PayU Configuration - Kompletne dane

Dodaj te zmienne środowiskowe do pliku `.env.local`:

```bash
# Środowisko PayU - PRODUKCJA (rzeczywiste płatności)
PAYU_ENVIRONMENT=production

# Produkcja PayU (środowisko live) - Twoje rzeczywiste dane
PAYU_POS_ID=4398525
PAYU_OAUTH_CLIENT_ID=4398525
PAYU_OAUTH_CLIENT_SECRET=1d1024b2a85f4c7ef10b7a8c4fbf0332
PAYU_LONG_KEY_MD5=d0b707ceb7ac72a400b71245842cac5c

# Sandbox PayU (środowisko testowe) - dla testów
PAYU_SANDBOX_POS_ID=4617644
PAYU_SANDBOX_OAUTH_CLIENT_ID=RDhIkKym
PAYU_SANDBOX_OAUTH_CLIENT_SECRET=your_sandbox_client_secret_here
PAYU_SANDBOX_LONG_KEY_MD5=your_sandbox_long_key_md5_here

# URL aplikacji - Twoja rzeczywista domena
NEXT_PUBLIC_APP_URL=https://monitor.wizaro.pl
```

## ✅ Kompletne dane PayU

- **Id sklepu:** uI3y2MmJ
- **Adres strony:** https://monitor.wizaro.pl
- **Id punktu płatności (pos_id):** 4398525
- **Drugi klucz (MD5):** d0b707ceb7ac72a400b71245842cac5c
- **OAuth client_id:** 4398525
- **OAuth client_secret:** 1d1024b2a85f4c7ef10b7a8c4fbf0332

## 🚀 Gotowe do produkcji

Twoja aplikacja jest skonfigurowana do pracy z prawdziwymi płatnościami PayU.

### URL-e PayU Produkcja:
- OAuth: `https://secure.payu.com/pl/standard/user/oauth/authorize`
- API: `https://secure.payu.com/api/v2_1`
- Orders: `https://secure.payu.com/api/v2_1/orders`

### Webhook URL (skonfiguruj w panelu PayU):
```
https://monitor.wizaro.pl/api/payu/webhook
```

## 🧪 Testowanie

Po skonfigurowaniu zmiennych środowiskowych, przetestuj:

```bash
curl https://monitor.wizaro.pl/api/payu/test
```

## ⚠️ Ważne uwagi

1. **To są dane PRODUKCYJNE** - wszystkie płatności będą rzeczywiste
2. **Webhook URL** - skonfiguruj w panelu PayU: https://monitor.wizaro.pl/api/payu/webhook
3. **SSL** - upewnij się, że certyfikat SSL jest ważny
4. **Testowanie** - najpierw przetestuj z małymi kwotami