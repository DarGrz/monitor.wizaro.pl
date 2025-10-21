// Debug PayU konfiguracji

console.log('🔍 Debug konfiguracji PayU')
console.log('═'.repeat(50))

const environment = process.env.PAYU_ENVIRONMENT || 'sandbox'
console.log(`Środowisko: ${environment}`)
console.log('')

console.log('📋 Zmienne środowiskowe:')
console.log(`PAYU_ENVIRONMENT: ${process.env.PAYU_ENVIRONMENT || 'BRAK (domyślnie sandbox)'}`)
console.log('')

if (environment === 'production') {
  console.log('🔴 PRODUKCJA:')
  console.log(`PAYU_POS_ID: ${process.env.PAYU_POS_ID || 'BRAK'}`)
  console.log(`PAYU_OAUTH_CLIENT_ID: ${process.env.PAYU_OAUTH_CLIENT_ID || 'BRAK'}`)
  console.log(`PAYU_OAUTH_CLIENT_SECRET: ${process.env.PAYU_OAUTH_CLIENT_SECRET ? 'USTAWIONE' : 'BRAK'}`)
  console.log(`PAYU_LONG_KEY_MD5: ${process.env.PAYU_LONG_KEY_MD5 ? 'USTAWIONE' : 'BRAK'}`)
} else {
  console.log('🟡 SANDBOX:')
  console.log(`PAYU_SANDBOX_POS_ID: ${process.env.PAYU_SANDBOX_POS_ID || 'BRAK'}`)
  console.log(`PAYU_SANDBOX_OAUTH_CLIENT_ID: ${process.env.PAYU_SANDBOX_OAUTH_CLIENT_ID || 'BRAK'}`)
  console.log(`PAYU_SANDBOX_OAUTH_CLIENT_SECRET: ${process.env.PAYU_SANDBOX_OAUTH_CLIENT_SECRET ? 'USTAWIONE' : 'BRAK'}`)
  console.log(`PAYU_SANDBOX_LONG_KEY_MD5: ${process.env.PAYU_SANDBOX_LONG_KEY_MD5 ? 'USTAWIONE' : 'BRAK'}`)
}

console.log('')
console.log(`NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'BRAK'}`)
console.log('')

// Sprawdź które dane są brakujące
const missing = []
if (environment === 'production') {
  if (!process.env.PAYU_POS_ID) missing.push('PAYU_POS_ID')
  if (!process.env.PAYU_OAUTH_CLIENT_ID) missing.push('PAYU_OAUTH_CLIENT_ID')
  if (!process.env.PAYU_OAUTH_CLIENT_SECRET) missing.push('PAYU_OAUTH_CLIENT_SECRET')
  if (!process.env.PAYU_LONG_KEY_MD5) missing.push('PAYU_LONG_KEY_MD5')
} else {
  if (!process.env.PAYU_SANDBOX_POS_ID) missing.push('PAYU_SANDBOX_POS_ID')
  if (!process.env.PAYU_SANDBOX_OAUTH_CLIENT_ID) missing.push('PAYU_SANDBOX_OAUTH_CLIENT_ID')
  if (!process.env.PAYU_SANDBOX_OAUTH_CLIENT_SECRET) missing.push('PAYU_SANDBOX_OAUTH_CLIENT_SECRET')
  if (!process.env.PAYU_SANDBOX_LONG_KEY_MD5) missing.push('PAYU_SANDBOX_LONG_KEY_MD5')
}

if (!process.env.NEXT_PUBLIC_APP_URL) missing.push('NEXT_PUBLIC_APP_URL')

if (missing.length > 0) {
  console.log('❌ Brakujące zmienne środowiskowe:')
  missing.forEach(var_ => console.log(`   - ${var_}`))
  console.log('')
  console.log('💡 Dodaj je do pliku .env.local')
} else {
  console.log('✅ Wszystkie zmienne środowiskowe są ustawione')
}

console.log('')
console.log('🌐 URL-e PayU:')
if (environment === 'production') {
  console.log('   OAuth: https://secure.payu.com/pl/standard/user/oauth/authorize')
  console.log('   API: https://secure.payu.com/api/v2_1/orders')
} else {
  console.log('   OAuth: https://secure.snd.payu.com/pl/standard/user/oauth/authorize')
  console.log('   API: https://secure.snd.payu.com/api/v2_1/orders')
}

console.log('')
console.log('🔧 Następne kroki:')
if (missing.length > 0) {
  console.log('   1. Uzupełnij brakujące zmienne w .env.local')
  console.log('   2. Uruchom ponownie serwer dev')
  console.log('   3. Przetestuj: http://localhost:3000/api/payu/test')
} else {
  console.log('   1. Przetestuj: http://localhost:3000/api/payu/test')
  console.log('   2. Jeśli test przejdzie, spróbuj utworzyć płatność')
}