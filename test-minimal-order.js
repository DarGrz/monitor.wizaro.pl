// Test minimalnego zamówienia PayU
// Uruchom: node --experimental-fetch test-minimal-order.js

const PAYU_CONFIG = {
  posId: '4398525',
  clientId: '4398525',
  clientSecret: '1d1024b2a85f4c7ef10b7a8c4fbf0332'
};

async function testMinimalOrder() {
  try {
    console.log('🧪 Test minimalnego zamówienia PayU');
    console.log('═'.repeat(50));

    // 1. Pobierz token OAuth
    console.log('1. Pobieranie tokena OAuth...');
    
    const oauthResponse = await fetch('https://secure.payu.com/pl/standard/user/oauth/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: PAYU_CONFIG.clientId,
        client_secret: PAYU_CONFIG.clientSecret
      }),
    });

    if (!oauthResponse.ok) {
      const errorText = await oauthResponse.text();
      throw new Error(`OAuth error: ${oauthResponse.status} ${errorText}`);
    }

    const tokenData = await oauthResponse.json();
    console.log(`✅ Token otrzymany: ${tokenData.access_token.substring(0, 12)}...`);

    // 2. Utwórz minimalne zamówienie
    console.log('2. Tworzenie minimalnego zamówienia...');
    
    const orderData = {
      customerIp: '127.0.0.1',
      merchantPosId: PAYU_CONFIG.posId,
      description: 'Test Order Monitor Wizaro',
      currencyCode: 'PLN',
      totalAmount: '1000', // 10.00 PLN
      continueUrl: 'https://monitor.wizaro.pl/payment-success',
      notifyUrl: 'https://monitor.wizaro.pl/api/payu/webhook',
      buyer: {
        email: 'test@monitor.wizaro.pl',
        firstName: 'Test',
        lastName: 'User',
        language: 'pl'
      },
      products: [
        {
          name: 'Test Product',
          unitPrice: '1000',
          quantity: '1'
        }
      ]
    };

    console.log('Dane zamówienia:', JSON.stringify(orderData, null, 2));

    const orderResponse = await fetch('https://secure.payu.com/api/v2_1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    console.log(`Status odpowiedzi: ${orderResponse.status}`);
    console.log('Headers:', Object.fromEntries(orderResponse.headers.entries()));

    const responseText = await orderResponse.text();
    console.log(`Odpowiedź (${responseText.length} znaków):`, responseText.substring(0, 500));

    if (responseText.startsWith('<!DOCTYPE html>')) {
      console.log('❌ PayU zwrócił HTML zamiast JSON');
      
      // Sprawdź czy HTML zawiera jakieś wskazówki
      const titleMatch = responseText.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        console.log(`HTML Title: ${titleMatch[1]}`);
      }
    } else {
      try {
        const orderResult = JSON.parse(responseText);
        console.log('✅ Otrzymano odpowiedź JSON:', orderResult);
        
        if (orderResult.redirectUri) {
          console.log(`🔗 Redirect URI: ${orderResult.redirectUri}`);
        }
      } catch (e) {
        console.log('❌ Błąd parsowania JSON:', e.message);
      }
    }

  } catch (error) {
    console.error('❌ Błąd:', error.message);
  }
}

testMinimalOrder();