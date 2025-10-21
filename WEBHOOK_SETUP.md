# Konfiguracja Webhook PayU - Instrukcje

## 🔗 Jak skonfigurować webhook w panelu PayU

### 1. Zaloguj się do panelu PayU
- Adres: https://secure.payu.com (produkcja)
- Użyj swoich danych logowania

### 2. Przejdź do punktu płatności
- Menu: **"Punkty płatności"** lub **"POS"**
- Wybierz punkt o ID: **4398525**

### 3. Skonfiguruj webhook
W sekcji **"Dane techniczne"** lub **"Konfiguracja"**:

```
Adres URL powiadomień (Notify URL):
https://monitor.wizaro.pl/api/payu/webhook
```

### 4. Ustawienia webhook
- **Metoda HTTP:** POST
- **Format:** JSON
- **Podpis:** TAK (używaj Drugi klucz MD5)

### 5. Testowanie webhook
Po konfiguracji, PayU wyśle testowe powiadomienie na Twój URL.

## 🧪 Weryfikacja konfiguracji

### Test endpoint w aplikacji:
```bash
curl https://monitor.wizaro.pl/api/payu/test
```

### Sprawdź logi webhook:
```bash
curl https://monitor.wizaro.pl/api/payu/webhook
```

## 📋 Checklist przed uruchomieniem

- [ ] ✅ Skonfigurowane zmienne środowiskowe
- [ ] ✅ Webhook URL dodany w panelu PayU
- [ ] ✅ SSL certyfikat ważny dla monitor.wizaro.pl
- [ ] ✅ Test endpoint `/api/payu/test` zwraca sukces
- [ ] ✅ Przetestowana płatność z małą kwotą

## 🚨 Bezpieczeństwo

1. **Nigdy nie commituj danych PayU do repozytorium**
2. **Używaj zmiennych środowiskowych**
3. **Regularnie rotuj client_secret**
4. **Monitoruj logi płatności**

## 📊 Monitorowanie

Sprawdzaj regularnie:
- Logi aplikacji w `/api/payu/webhook`
- Status płatności w panelu PayU
- Powiadomienia o błędach webhook

## 🔧 Debugging

Jeśli webhook nie działa:

1. Sprawdź czy URL jest dostępny: `curl -I https://monitor.wizaro.pl/api/payu/webhook`
2. Sprawdź logi aplikacji
3. Zweryfikuj podpis MD5 w kodzie
4. Przetestuj z PayU sandbox najpierw