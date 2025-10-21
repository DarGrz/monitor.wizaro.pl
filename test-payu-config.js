// Test PayU konfiguracji z rzeczywistymi danymi PRODUKCYJNYMI
const PAYU_CONFIG = {
  shopId: 'uI3y2MmJ',
  domain: 'https://monitor.wizaro.pl',
  posId: '4398525',
  clientId: '4398525',
  clientSecret: '1d1024b2a85f4c7ef10b7a8c4fbf0332',
  longKeyMD5: 'd0b707ceb7ac72a400b71245842cac5c'
}

async function testPayUConfig() {
  console.log('🧪 Test konfiguracji PayU PRODUKCJA')
  console.log('═'.repeat(60))
  
  console.log('📋 Twoje dane PayU (PRODUKCYJNE):')
  console.log(`   Id sklepu: ${PAYU_CONFIG.shopId}`)
  console.log(`   Adres strony: ${PAYU_CONFIG.domain}`)
  console.log(`   POS ID: ${PAYU_CONFIG.posId}`)
  console.log(`   Client ID: ${PAYU_CONFIG.clientId}`)
  console.log(`   Client Secret: ${PAYU_CONFIG.clientSecret.substring(0, 8)}...`)
  console.log(`   Long Key MD5: ${PAYU_CONFIG.longKeyMD5.substring(0, 8)}...`)
  console.log(`   Środowisko: PRODUKCJA (rzeczywiste płatności!)`)
  console.log('')

  console.log('🌐 URL-e PayU Produkcja:')
  console.log('   OAuth: https://secure.payu.com/pl/standard/user/oauth/authorize')
  console.log('   API: https://secure.payu.com/api/v2_1')
  console.log('   Orders: https://secure.payu.com/api/v2_1/orders')
  console.log('')

  console.log('📡 Webhook URL (skonfiguruj w panelu PayU):')
  console.log(`   ${PAYU_CONFIG.domain}/api/payu/webhook`)
  console.log('')

  // Test OAuth z rzeczywistymi danymi
  try {
    console.log('🚀 Test połączenia OAuth (z prawdziwymi danymi):')
    
    const response = await fetch('https://secure.payu.com/pl/standard/user/oauth/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: PAYU_CONFIG.clientId,
        client_secret: PAYU_CONFIG.clientSecret
      }),
    })

    const responseText = await response.text()
    console.log(`   Status: ${response.status}`)
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText)
        if (data.access_token) {
          console.log('   ✅ OAuth działa! Token otrzymany.')
          console.log(`   Token: ${data.access_token.substring(0, 12)}...`)
          console.log(`   Typ: ${data.token_type}`)
          console.log(`   Wygasa za: ${data.expires_in} sekund`)
        }
      } catch (e) {
        console.log(`   ⚠️  Nieoczekiwana odpowiedź: ${responseText}`)
      }
    } else {
      console.log(`   ❌ Błąd OAuth: ${responseText}`)
    }
    
  } catch (error) {
    console.log(`   ❌ Błąd połączenia: ${error.message}`)
  }

  console.log('')
  console.log('⚠️  UWAGA: To są dane PRODUKCYJNE!')
  console.log('   - Wszystkie płatności będą rzeczywiste')
  console.log('   - Pamiętaj o skonfigurowaniu webhook URL w panelu PayU')
  console.log('   - Przetestuj z małymi kwotami')
}

// Uruchom test jeśli plik jest wywołany bezpośrednio
if (typeof window === 'undefined') {
  testPayUConfig().catch(console.error)
}

module.exports = { testPayUConfig, PAYU_CONFIG }