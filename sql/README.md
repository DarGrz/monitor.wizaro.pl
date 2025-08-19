# System Subskrypcji - monitor.wizaro.pl

## Przegląd systemu

System obsługuje dwa typy płatności:
1. **Subskrypcje abonamentowe** - miesięczne/roczne plany z limitami darmowych usług
2. **Usługi jednorazowe** - płatności za pojedyncze usługi poza abonamentem

## Plany Abonamentowe

### Basic - 599 zł netto/miesiąc
- Ochrona **1 firmy**
- **3 usunięcia opinii** miesięcznie w cenie
- **10% zniżka** na dodatkowe usługi
- Monitoring negatywnych opinii
- Cotygodniowy raport e-mail
- Powiadomienia o nowych wpisach

### Professional - 999 zł netto/miesiąc  
- Ochrona **2 firm**
- **5 usunięć opinii** miesięcznie w cenie
- **20% zniżka** na dodatkowe usługi
- Monitoring negatywnych opinii
- Cotygodniowy raport e-mail
- Powiadomienia o nowych wpisach

### Enterprise - 1999 zł netto/miesiąc
- Ochrona **do 4 firm**
- **10 usunięć opinii** miesięcznie w cenie
- **30% zniżka** na dodatkowe usługi
- Monitoring negatywnych opinii
- Cotygodniowe raporty zbiorcze
- Powiadomienia o nowych wpisach

## Usługi Jednorazowe (ceny brutto)

- **Usunięcie opinii**: 299 zł
- **Usunięcie profilu**: 699 zł  
- **Usunięcie wizytówki Google**: 1299 zł
- **Reset wizytówki Google**: 2199 zł

## Struktura Bazy Danych

### Główne tabele:

1. **subscription_plans** - definicje planów abonamentowych
2. **user_subscriptions** - aktywne subskrypcje użytkowników
3. **services** - definicje usług jednorazowych
4. **service_orders** - zamówienia usług jednorazowych
5. **payment_history** - historia płatności (subskrypcje + usługi)
6. **subscription_usage** - śledzenie wykorzystania limitów abonamentowych

### Funkcje pomocnicze:

- `can_use_subscription_service()` - sprawdza czy użytkownik ma dostępne limity
- `calculate_discounted_price()` - oblicza cenę ze zniżką abonamentową
- `reset_monthly_limits()` - resetuje miesięczne limity (cron)

### Widoki:

- `user_subscription_limits` - pokazuje dostępne limity dla użytkowników

## Logika Biznesowa

### Wykorzystanie limitów abonamentowych:
1. Użytkownik z aktywnym abonamentem może wykorzystać darmowe usunięcia opinii
2. Po wykorzystaniu limitu - płaci ze zniżką za dodatkowe usługi
3. Limity resetują się co miesiąc/rok (w zależności od cyklu rozliczeniowego)

### Zniżki:
- Basic: 10% zniżki na dodatkowe usługi
- Professional: 20% zniżki na dodatkowe usługi  
- Enterprise: 30% zniżki na dodatkowe usługi

### Rozliczanie VAT:
- Wszystkie ceny przechowywane jako netto i brutto
- VAT 23% dla usług krajowych
- Faktury z podziałem na netto/brutto/VAT

## Integracja z systemami płatności

System przygotowany na integrację z:
- Stripe
- PayU  
- Przelewy24
- Przelewy bankowe

Każda płatność zawiera:
- `external_payment_id` - ID z systemu płatności
- `payment_method` - sposób płatności
- Pełne rozliczenie VAT

## Automatyzacja

### Cronjob do resetowania limitów:
```sql
SELECT reset_monthly_limits();
```

### Monitoring wygasających subskrypcji:
```sql
-- Subskrypcje wygasające w ciągu 7 dni
SELECT * FROM user_subscription_limits 
WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days';
```

## Bezpieczeństwo (RLS)

- Każdy użytkownik widzi tylko swoje dane
- Plany subskrypcji są publiczne (tylko odczyt)
- Usługi są publiczne (tylko odczyt)
- Pełna izolacja danych między użytkownikami

## Przykłady użycia

### Sprawdzenie dostępnych limitów:
```sql
SELECT * FROM user_subscription_limits WHERE user_id = 'user-uuid';
```

### Obliczenie ceny ze zniżką:
```sql
SELECT * FROM calculate_discounted_price('user-uuid', 243.09, 299.00);
```

### Wykorzystanie usługi abonamentowej:
```sql
SELECT can_use_subscription_service('user-uuid', 'opinion_removal');
```
