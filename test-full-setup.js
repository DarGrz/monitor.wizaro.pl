#!/usr/bin/env node

// Skrypt do testowania kompletnej konfiguracji PayU
import crypto from 'crypto'

const CONFIG = {
  domain: 'https://monitor.wizaro.pl',
  posId: '4398525',
  clientId: '4398525',
  clientSecret: '1d1024b2a85f4c7ef10b7a8c4fbf0332',
  longKeyMD5: 'd0b707ceb7ac72a400b71245842cac5c'
}

async function runFullTest() {
  console.log('🚀 PayU - Test kompletnej konfiguracji')
  console.log('═'.repeat(60))
  console.log('')

  // Test 1: SSL Certificate
  console.log('🔒 Test 1: Certyfikat SSL')
  try {
    const response = await fetch(CONFIG.domain)
    console.log(`   ✅ SSL działa - Status: ${response.status}`)
  } catch (error) {
    console.log(`   ❌ Błąd SSL: ${error.message}`)
  }
  console.log('')

  // Test 2: OAuth Token
  console.log('🔐 Test 2: OAuth Token PayU')
  try {
    const response = await fetch('https://secure.payu.com/pl/standard/user/oauth/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CONFIG.clientId,
        client_secret: CONFIG.clientSecret
      }),
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ OAuth Token otrzymany`)
      console.log(`   Token: ${data.access_token.substring(0, 12)}...`)
      console.log(`   Wygasa za: ${data.expires_in} sekund`)
    } else {
      const errorText = await response.text()
      console.log(`   ❌ Błąd OAuth: ${errorText}`)
    }
  } catch (error) {
    console.log(`   ❌ Błąd połączenia OAuth: ${error.message}`)
  }
  console.log('')

  // Test 3: Webhook endpoint
  console.log('📡 Test 3: Webhook Endpoint')
  try {
    const webhookUrl = `${CONFIG.domain}/api/payu/webhook`
    const response = await fetch(webhookUrl, {
      method: 'GET'
    })
    console.log(`   Status webhook: ${response.status}`)
    if (response.status === 405 || response.status === 200) {
      console.log(`   ✅ Webhook endpoint dostępny`)
    } else {
      console.log(`   ⚠️  Webhook może nie działać poprawnie`)
    }
  } catch (error) {
    console.log(`   ❌ Błąd webhook: ${error.message}`)
  }
  console.log('')

  // Test 4: Test endpoint aplikacji
  console.log('🧪 Test 4: Test Endpoint Aplikacji')
  try {
    const testUrl = `${CONFIG.domain}/api/payu/test`
    const response = await fetch(testUrl)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ Test endpoint działa`)
      console.log(`   OAuth test: ${data.oauth?.result ? 'SUCCESS' : 'FAILED'}`)
    } else {
      console.log(`   ❌ Test endpoint nie działa - Status: ${response.status}`)
    }
  } catch (error) {
    console.log(`   ❌ Błąd test endpoint: ${error.message}`)
  }
  console.log('')

  // Test 5: Podpis MD5
  console.log('🔏 Test 5: Weryfikacja podpisu MD5')
  const testData = 'test-webhook-data'
  const signature = crypto.createHash('md5')
    .update(testData + CONFIG.longKeyMD5)
    .digest('hex')
  console.log(`   ✅ Generator podpisu działa`)
  console.log(`   Test signature: ${signature}`)
  console.log('')

  // Podsumowanie
  console.log('📋 Podsumowanie konfiguracji:')
  console.log(`   Domain: ${CONFIG.domain}`)
  console.log(`   POS ID: ${CONFIG.posId}`)
  console.log(`   Client ID: ${CONFIG.clientId}`)
  console.log(`   Webhook URL: ${CONFIG.domain}/api/payu/webhook`)
  console.log(`   Test URL: ${CONFIG.domain}/api/payu/test`)
  console.log('')
  console.log('🎯 Następne kroki:')
  console.log('   1. Skonfiguruj webhook URL w panelu PayU')
  console.log('   2. Przetestuj płatność z małą kwotą')
  console.log('   3. Monitoruj logi aplikacji')
}

// Uruchom test
runFullTest().catch(console.error)