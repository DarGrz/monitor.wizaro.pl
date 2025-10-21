// Debug PayU API - sprawdzenie czy konto production działa

const PRODUCTION_CONFIG = {
  posId: '4398525',
  clientId: '4398525',
  clientSecret: '1d1024b2a85f4c7ef10b7a8c4fbf0332',
  baseUrl: 'https://secure.payu.com'
}

async function debugPayUAPI() {
  console.log('🔍 PayU Production API Debug')
  console.log('=' .repeat(50))
  
  try {
    // 1. Test OAuth
    console.log('1. Testowanie OAuth...')
    const oauthResponse = await fetch(`${PRODUCTION_CONFIG.baseUrl}/pl/standard/user/oauth/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=client_credentials&client_id=${PRODUCTION_CONFIG.clientId}&client_secret=${PRODUCTION_CONFIG.clientSecret}`
    })
    
    console.log('OAuth Status:', oauthResponse.status)
    console.log('OAuth Headers:', Object.fromEntries(oauthResponse.headers.entries()))
    
    const oauthText = await oauthResponse.text()
    console.log('OAuth Response:', oauthText.substring(0, 500))
    
    if (!oauthResponse.ok) {
      console.error('❌ OAuth failed!')
      return
    }
    
    let oauthData
    try {
      oauthData = JSON.parse(oauthText)
      console.log('✅ OAuth Success - Token Type:', oauthData.token_type)
    } catch (e) {
      console.error('❌ OAuth response is not JSON')
      return
    }
    
    // 2. Test Account Info (jeśli dostępne)
    console.log('\n2. Testowanie informacji o koncie...')
    const accountResponse = await fetch(`${PRODUCTION_CONFIG.baseUrl}/api/v2_1/orders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${oauthData.access_token}`,
        'Accept': 'application/json'
      }
    })
    
    console.log('Account Status:', accountResponse.status)
    const accountText = await accountResponse.text()
    console.log('Account Response:', accountText.substring(0, 300))
    
    // 3. Test Minimal Order Creation z parametrem API
    console.log('\n3. Testowanie utworzenia minimalnego zamówienia...')
    const orderData = {
      customerIp: '8.8.8.8',
      merchantPosId: PRODUCTION_CONFIG.posId,
      description: 'Debug Test Order',
      currencyCode: 'PLN',
      totalAmount: '100',
      buyer: {
        email: 'debug@test.pl'
      },
      products: [{
        name: 'Test Product',
        unitPrice: '100',
        quantity: '1'
      }]
    }
    
    console.log('Order Data:', JSON.stringify(orderData, null, 2))
    
    // Dodajemy specjalne nagłówki, które mogą zmusić PayU do zwrócenia JSON
    const orderResponse = await fetch(`${PRODUCTION_CONFIG.baseUrl}/api/v2_1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${oauthData.access_token}`,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',  // Może zmusić PayU do API mode
        'User-Agent': 'Monitor.Wizaro.pl/1.0',
        'X-PayU-Format': 'JSON',  // Niestandardowy nagłówek dla PayU
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(orderData)
    })
    
    console.log('Order Status:', orderResponse.status)
    console.log('Order Headers:', Object.fromEntries(orderResponse.headers.entries()))
    
    const orderText = await orderResponse.text()
    console.log('Order Response (first 2000 chars):', orderText.substring(0, 2000))
    
    const isHtml = orderText.trim().startsWith('<!DOCTYPE html>')
    console.log('Is HTML Response:', isHtml)
    
    if (isHtml) {
      console.error('❌ PayU returned HTML instead of JSON')
      
      // Sprawdźmy czy w HTML są ukryte dane zamówienia
      const orderIdMatch = orderText.match(/orderId["\s]*[:=]["\s]*([A-Z0-9]+)/i)
      const redirectMatch = orderText.match(/redirect["\s]*[:=]["\s]*["']([^"']+)/i)
      const formMatch = orderText.match(/<form[^>]+action=["']([^"']+)["']/i)
      
      console.log('🔍 HTML Analysis:')
      console.log('Order ID found:', orderIdMatch ? orderIdMatch[1] : 'NO')
      console.log('Redirect URL found:', redirectMatch ? redirectMatch[1] : 'NO')
      console.log('Form action found:', formMatch ? formMatch[1] : 'NO')
      
      // Sprawdź czy jest JavaScript config
      if (orderText.includes('window.config')) {
        console.log('✅ Found window.config - this is PayU payment page')
      }
      
    } else {
      console.log('✅ PayU returned proper response')
    }
    
  } catch (error) {
    console.error('Debug Error:', error.message)
  }
}

debugPayUAPI()