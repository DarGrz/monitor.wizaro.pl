// Prosty test PayU API
console.log('Test PayU API...')

const PAYU_SANDBOX_OAUTH_CLIENT_ID = '300746'
const PAYU_SANDBOX_OAUTH_CLIENT_SECRET = '2ee86a66e5d97e3fadc400c9f19b065d'
const PAYU_SANDBOX_API_URL = 'https://secure.snd.payu.com/api/v2_1'

async function testPayUAuth() {
  try {
    console.log('Testowanie PayU OAuth...')
    
    const response = await fetch(`${PAYU_SANDBOX_API_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: PAYU_SANDBOX_OAUTH_CLIENT_ID,
        client_secret: PAYU_SANDBOX_OAUTH_CLIENT_SECRET,
      }),
    })

    console.log('Status:', response.status)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('Response:', responseText)
    
    if (response.ok) {
      const data = JSON.parse(responseText)
      console.log('Token:', data.access_token)
    }
  } catch (error) {
    console.error('Błąd:', error)
  }
}

testPayUAuth()
