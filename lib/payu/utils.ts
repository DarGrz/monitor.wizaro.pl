import crypto from 'crypto'
import { 
  PAYU_CONFIG, 
  PAYU_RETURN_URLS,
  PayUOrderCreateRequest, 
  PayUOrderCreateResponse, 
  PayUAccessTokenResponse,
  PayUNotification,
  PayUOrderDetailsResponse
} from './config'

/**
 * Sprawdź konfigurację PayU
 */
export function validatePayUConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!PAYU_CONFIG.posId) {
    errors.push('Brak PAYU_POS_ID lub PAYU_SANDBOX_POS_ID')
  }
  
  if (!PAYU_CONFIG.oauthClientId) {
    errors.push('Brak PAYU_OAUTH_CLIENT_ID lub PAYU_SANDBOX_OAUTH_CLIENT_ID')
  }
  
  if (!PAYU_CONFIG.oauthClientSecret) {
    errors.push('Brak PAYU_OAUTH_CLIENT_SECRET lub PAYU_SANDBOX_OAUTH_CLIENT_SECRET')
  }
  
  if (!PAYU_CONFIG.longKeyMD5) {
    errors.push('Brak PAYU_LONG_KEY_MD5 lub PAYU_SANDBOX_LONG_KEY_MD5')
  }
  
  if (!PAYU_RETURN_URLS.notifyUrl) {
    errors.push('Brak NEXT_PUBLIC_APP_URL dla webhook URL')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Pobierz token dostępu OAuth z PayU - zgodnie z dokumentacją PayU
 */
export async function getPayUAccessToken(): Promise<string> {
  console.log('PayU Config:', {
    apiUrl: PAYU_CONFIG.apiUrl,
    oauthClientId: PAYU_CONFIG.oauthClientId,
    hasClientSecret: !!PAYU_CONFIG.oauthClientSecret,
    environment: process.env.PAYU_ENVIRONMENT,
    isSandbox: PAYU_CONFIG.isSandbox
  })

  // PayU OAuth endpoint - zgodnie z oficjalną dokumentacją PayU
  const oauthUrl = PAYU_CONFIG.isSandbox 
    ? 'https://secure.snd.payu.com/pl/standard/user/oauth/authorize'
    : 'https://secure.payu.com/pl/standard/user/oauth/authorize'
  
  console.log('PayU OAuth URL:', oauthUrl)
  
  const requestBody = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: PAYU_CONFIG.oauthClientId!,
    client_secret: PAYU_CONFIG.oauthClientSecret!,
  })
  
  console.log('PayU OAuth Request Body:', {
    grant_type: 'client_credentials',
    client_id: PAYU_CONFIG.oauthClientId,
    client_secret: PAYU_CONFIG.oauthClientSecret ? PAYU_CONFIG.oauthClientSecret.substring(0, 8) + '...' : 'BRAK'
  })
  
  const response = await fetch(oauthUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody,
  })

  console.log('PayU OAuth response status:', response.status)
  console.log('PayU OAuth response headers:', Object.fromEntries(response.headers.entries()))

  if (!response.ok) {
    const errorText = await response.text()
    console.error('PayU OAuth error text:', errorText)
    
    // Sprawdź czy to HTML (błąd konfiguracji)
    if (errorText.trim().startsWith('<!DOCTYPE html>') || errorText.trim().startsWith('<html')) {
      console.error('PayU OAuth zwrócił HTML - prawdopodobnie błędny URL lub konfiguracja')
      throw new Error(`PayU OAuth zwrócił stronę HTML zamiast JSON. Status: ${response.status}. Sprawdź URL OAuth i konfigurację.`)
    }
    
    // Obsługa specyficznych błędów PayU zgodnie z dokumentacją
    if (response.status === 401) {
      throw new Error('Błędne dane uwierzytelnienia PayU (client_id lub client_secret)')
    } else if (response.status === 400) {
      try {
        const errorData = JSON.parse(errorText)
        throw new Error(`Nieprawidłowe żądanie OAuth PayU: ${errorData.error_description || errorText}`)
      } catch {
        throw new Error(`Nieprawidłowe żądanie OAuth PayU: ${errorText}`)
      }
    } else {
      throw new Error(`Błąd autoryzacji PayU: ${response.status} ${errorText}`)
    }
  }

  const responseText = await response.text()
  console.log('PayU OAuth response text:', responseText)
  
  try {
    const data: PayUAccessTokenResponse = JSON.parse(responseText)
    
    if (!data.access_token) {
      throw new Error('Brak tokena w odpowiedzi PayU')
    }
    
    console.log('PayU OAuth success:', {
      tokenPrefix: data.access_token.substring(0, 12) + '...',
      tokenType: data.token_type,
      expiresIn: data.expires_in
    })
    
    return data.access_token
  } catch (parseError) {
    console.error('Błąd parsowania JSON PayU:', parseError)
    console.error('Odpowiedź PayU:', responseText)
    throw new Error(`Nieprawidłowa odpowiedź JSON z PayU OAuth: ${responseText}`)
  }
}

/**
 * Utwórz zamówienie w PayU - zgodnie z dokumentacją PayU API v2.1
 */
export async function createPayUOrder(
  orderData: Omit<PayUOrderCreateRequest, 'merchantPosId' | 'continueUrl' | 'notifyUrl'>,
  customerIp?: string
): Promise<PayUOrderCreateResponse> {
  // Sprawdź konfigurację przed rozpoczęciem
  const configValidation = validatePayUConfig()
  if (!configValidation.isValid) {
    throw new Error(`Błędna konfiguracja PayU: ${configValidation.errors.join(', ')}`)
  }

  console.log('PayU Order - rozpoczęcie tworzenia zamówienia')
  
  // Walidacja danych wejściowych
  if (!orderData.description || orderData.description.length < 3) {
    throw new Error('Opis zamówienia musi mieć co najmniej 3 znaki')
  }
  
  if (!orderData.currencyCode || orderData.currencyCode !== 'PLN') {
    throw new Error('Waluta musi być PLN')
  }
  
  if (!orderData.totalAmount || parseInt(orderData.totalAmount) < 100) {
    throw new Error('Kwota musi być co najmniej 1.00 PLN (100 groszy)')
  }
  
  if (!orderData.buyer?.email) {
    throw new Error('Email kupującego jest wymagany')
  }
  
  if (!orderData.products || orderData.products.length === 0) {
    throw new Error('Co najmniej jeden produkt jest wymagany')
  }
  
  // Sprawdź czy produkty mają prawidłowe dane
  for (const product of orderData.products) {
    if (!product.name || product.name.length < 1) {
      throw new Error('Nazwa produktu jest wymagana')
    }
    if (!product.unitPrice || parseInt(product.unitPrice) < 1) {
      throw new Error('Cena produktu musi być większa niż 0')
    }
    if (!product.quantity || parseInt(product.quantity) < 1) {
      throw new Error('Ilość produktu musi być większa niż 0')
    }
  }
  
  const accessToken = await getPayUAccessToken()

  // Przygotuj dane zamówienia zgodnie z dokumentacją PayU - MINIMALNA WERSJA
  const payuOrderData = {
    notifyUrl: PAYU_RETURN_URLS.notifyUrl,
    continueUrl: PAYU_RETURN_URLS.continueUrl,
    customerIp: customerIp || orderData.customerIp || '127.0.0.1',
    merchantPosId: PAYU_CONFIG.posId!,
    description: orderData.description,
    currencyCode: orderData.currencyCode,
    totalAmount: orderData.totalAmount,
    // Dodaj extOrderId tylko jeśli jest podany i nie jest pusty
    ...(orderData.extOrderId && { extOrderId: orderData.extOrderId }),
    buyer: {
      email: orderData.buyer.email,
      phone: orderData.buyer.phone || '123456789',
      firstName: orderData.buyer.firstName || 'Klient',
      lastName: orderData.buyer.lastName || 'Monitor Wizaro',
      language: orderData.buyer.language || 'pl'
    },
    products: orderData.products.map(product => ({
      name: product.name,
      unitPrice: product.unitPrice,
      quantity: product.quantity
    }))
  }

  // URL API zgodny z dokumentacją
  const orderUrl = PAYU_CONFIG.isSandbox 
    ? 'https://secure.snd.payu.com/api/v2_1/orders'
    : 'https://secure.payu.com/api/v2_1/orders'

  console.log('PayU Order Request:', {
    url: orderUrl,
    environment: PAYU_CONFIG.isSandbox ? 'sandbox' : 'production',
    merchantPosId: payuOrderData.merchantPosId,
    totalAmount: payuOrderData.totalAmount,
    extOrderId: payuOrderData.extOrderId,
    buyerEmail: payuOrderData.buyer.email,
    productsCount: payuOrderData.products.length
  })

  // Dodatkowe logowanie pełnych danych dla debugowania
  console.log('PayU Order Full Data:', JSON.stringify(payuOrderData, null, 2))

  const response = await fetch(orderUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'  // Dodajemy explicit Accept header
    },
    body: JSON.stringify(payuOrderData),
  })

  console.log('PayU Order Response Status:', response.status)
  console.log('PayU Order Response Headers:', Object.fromEntries(response.headers.entries()))

  // PayU może zwrócić status 302 z redirectUri w Location header
  if (response.status === 302) {
    const redirectUri = response.headers.get('Location')
    if (redirectUri) {
      console.log('✅ PayU zwrócił redirect (302) z Location header:', redirectUri)
      
      // Generuj orderId z URL jeśli możliwe, lub użyj extOrderId
      const tempOrderId = payuOrderData.extOrderId || `REDIRECT-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
      
      return {
        orderId: tempOrderId,
        extOrderId: payuOrderData.extOrderId || tempOrderId,
        status: {
          statusCode: 'SUCCESS',
          statusDesc: 'Order created with redirect (302)'
        },
        redirectUri: redirectUri
      }
    }
  }

  const responseText = await response.text()
  console.log('PayU Order Response Text (pierwsze 1000 znaków):', responseText.substring(0, 1000))

  // Sprawdź czy odpowiedź to HTML (błąd PayU)
  if (responseText.trim().startsWith('<!DOCTYPE html>') || responseText.trim().startsWith('<html')) {
    console.error('PayU zwrócił stronę HTML zamiast JSON - prawdopodobnie błąd żądania')
    console.error('Status:', response.status)
    console.error('URL:', orderUrl)
    console.error('Token prefix:', accessToken.substring(0, 10) + '...')
    console.error('Response Content-Type:', response.headers.get('content-type'))
    
    // Spróbuj wyciągnąć więcej informacji z HTML
    const titleMatch = responseText.match(/<title>(.*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1] : 'Unknown'
    console.error('HTML Title:', title)
    
    // Sprawdź czy to strona błędu PayU
    if (responseText.includes('error') || responseText.includes('Error')) {
      console.error('HTML zawiera tekst "error" - prawdopodobnie strona błędu PayU')
    }
    
    // Sprawdź najczęstsze przyczyny - ale status 200 oznacza że request dotarł
    if (response.status === 200) {
      // Sprawdź czy to gotowa strona płatności PayU (status 200 + window.config)
      if (responseText.includes('window.config') && title === 'PayU') {
        console.log('✅ PayU zwrócił gotową stronę płatności (tryb HTML)')
        
        // Wygeneruj unikalny identyfikator dla tego zamówienia
        const tempOrderId = 'HTML-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15)
        
        // W przypadku HTML response, PayU już przygotował stronę płatności
        // Powinniśmy przekierować bezpośrednio do oryginalnego URL-a z parametrami POST
        // lub stworzyć endpoint który wykona POST request i zwróci HTML
        
        console.log('Tworzymy redirectUri dla formularza płatności PayU')
        
        // Zamiast próbować odgadnąć URL formularza PayU,
        // przekieruj na nasz endpoint który wykona POST i zwróci HTML od PayU
        const redirectUri = `/api/payu/payment-page/${tempOrderId}`
        
        console.log('Przekierowuję na nasz endpoint dla PayU HTML:', redirectUri)
        
        // Zwróć odpowiedź wskazującą na tryb HTML
        return {
          orderId: tempOrderId,
          extOrderId: payuOrderData.extOrderId || tempOrderId,
          status: {
            statusCode: 'SUCCESS',
            statusDesc: 'Order created in HTML mode - redirect to payment page'
          },
          redirectUri: redirectUri
        }
      }
      
      // Status 200 z HTML zazwyczaj oznacza że:
      // 1. Brakuje wymaganych pól w JSON
      // 2. Nieprawidłowy format JSON
      // 3. Nieprawidłowe wartości pól
      throw new Error(`PayU zwrócił HTML zamiast JSON (Status 200) - prawdopodobnie błąd w danych zamówienia lub brakujące wymagane pola. Sprawdź logi powyżej.`)
    } else if (response.status === 302 || response.status === 301) {
      throw new Error(`PayU przekierowanie (${response.status}) - sprawdź URL API. Możliwe że używasz błędnego endpointu.`)
    } else if (response.status === 404) {
      throw new Error('PayU API endpoint nie znaleziony (404) - sprawdź URL API')
    } else if (response.status === 403) {
      throw new Error('PayU odmowa dostępu (403) - sprawdź token OAuth i uprawnienia')
    } else if (response.status === 401) {
      throw new Error('PayU błąd uwierzytelnienia (401) - token OAuth jest nieprawidłowy')
    } else {
      throw new Error(`PayU zwrócił stronę HTML zamiast JSON (Status: ${response.status}). Sprawdź konfigurację API.`)
    }
  }

  if (!response.ok) {
    const errorDetails = {
      status: response.status,
      statusText: response.statusText,
      response: responseText.substring(0, 1000)
    }
    console.error('PayU Order Error Details:', errorDetails)
    
    // Obsługa specyficznych błędów PayU zgodnie z dokumentacją
    if (response.status === 400) {
      try {
        const errorData = JSON.parse(responseText)
        const statusCode = errorData.status?.statusCode
        const statusDesc = errorData.status?.statusDesc
        
        if (statusCode === 'ERROR_VALUE_INVALID') {
          throw new Error(`Nieprawidłowe dane zamówienia: ${statusDesc || 'Sprawdź poprawność danych'}`)
        } else if (statusCode === 'ERROR_VALUE_MISSING') {
          throw new Error(`Brakujące dane zamówienia: ${statusDesc || 'Uzupełnij wymagane pola'}`)
        } else if (statusCode === 'ERROR_ORDER_NOT_UNIQUE') {
          throw new Error('Zamówienie już istnieje - extOrderId musi być unikalny')
        } else {
          throw new Error(`Błąd PayU: ${statusDesc || 'Nieprawidłowe żądanie'}`)
        }
      } catch {
        throw new Error(`Błąd tworzenia zamówienia PayU (400): ${responseText.substring(0, 200)}`)
      }
    } else if (response.status === 401) {
      throw new Error('Błąd autoryzacji PayU - sprawdź token dostępu')
    } else if (response.status === 403) {
      throw new Error('Brak uprawnień do utworzenia zamówienia PayU')
    } else if (response.status === 500) {
      throw new Error('System PayU jest niedostępny. Spróbuj ponownie później.')
    } else {
      throw new Error(`Błąd tworzenia zamówienia PayU: ${response.status} ${responseText.substring(0, 200)}`)
    }
  }
  
  // IMPORTANT: PayU może zwrócić status 200 ale z HTML gdy są błędy w danych

  try {
    const responseData: PayUOrderCreateResponse = JSON.parse(responseText)
    console.log('PayU Order Success:', responseData)
    
    // Sprawdź czy odpowiedź zawiera wymagane dane
    if (responseData.status?.statusCode !== 'SUCCESS') {
      throw new Error(`PayU zwrócił status: ${responseData.status?.statusCode}`)
    }
    
    if (!responseData.redirectUri) {
      throw new Error('PayU nie zwrócił redirectUri')
    }
    
    return responseData
  } catch (parseError) {
    console.error('Błąd parsowania JSON PayU Order:', parseError)
    console.error('Odpowiedź PayU Order (500 znaków):', responseText.substring(0, 500))
    throw new Error(`Nieprawidłowa odpowiedź JSON z PayU Order: ${responseText.substring(0, 200)}`)
  }
}

/**
 * Pobierz szczegóły zamówienia z PayU - zgodnie z dokumentacją API v2.1
 */
export async function getPayUOrder(orderId: string): Promise<PayUOrderDetailsResponse> {
  const accessToken = await getPayUAccessToken()

  const orderUrl = PAYU_CONFIG.isSandbox 
    ? `https://secure.snd.payu.com/api/v2_1/orders/${orderId}`
    : `https://secure.payu.com/api/v2_1/orders/${orderId}`

  const response = await fetch(orderUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('PayU Get Order Error:', {
      status: response.status,
      statusText: response.statusText,
      response: errorText
    })
    
    if (response.status === 404) {
      throw new Error('Zamówienie nie zostało znalezione')
    } else if (response.status === 401) {
      throw new Error('Błąd autoryzacji PayU')
    } else {
      throw new Error(`Błąd pobierania zamówienia PayU: ${response.status}`)
    }
  }

  const responseText = await response.text()
  
  try {
    return JSON.parse(responseText)
  } catch {
    throw new Error('Nieprawidłowa odpowiedź JSON z PayU')
  }
}

/**
 * Utwórz zamówienie subskrypcji PayU - z pierwszą płatnością dla zapisania karty
 */
export async function createPayUSubscriptionOrder(
  orderData: Omit<PayUOrderCreateRequest, 'merchantPosId' | 'continueUrl' | 'notifyUrl'>,
  customerIp?: string,
  isFirstPayment: boolean = true
): Promise<PayUOrderCreateResponse> {
  const accessToken = await getPayUAccessToken()

  // Przygotuj dane zamówienia z obsługą płatności cyklicznych
  const payuOrderData = {
    notifyUrl: PAYU_RETURN_URLS.notifyUrl,
    customerIp: customerIp || orderData.customerIp || '127.0.0.1',
    merchantPosId: PAYU_CONFIG.posId!,
    description: orderData.description,
    currencyCode: orderData.currencyCode,
    totalAmount: orderData.totalAmount,
    extOrderId: orderData.extOrderId,
    // Dodajemy parametry dla płatności cyklicznych
    recurring: isFirstPayment ? 'FIRST' : 'STANDARD',
    cardOnFile: isFirstPayment ? 'FIRST' : 'STANDARD',
    buyer: {
      email: orderData.buyer.email,
      phone: orderData.buyer.phone || '123456789',
      firstName: orderData.buyer.firstName || 'Klient',
      lastName: orderData.buyer.lastName || 'Monitor Wizaro',
      language: orderData.buyer.language || 'pl'
    },
    products: orderData.products.map(product => ({
      name: product.name,
      unitPrice: product.unitPrice,
      quantity: product.quantity
    }))
  }

  // URL API zgodny z dokumentacją
  const orderUrl = PAYU_CONFIG.isSandbox 
    ? 'https://secure.snd.payu.com/api/v2_1/orders'
    : 'https://secure.payu.com/api/v2_1/orders'

  console.log('PayU Subscription Order Request:', {
    url: orderUrl,
    data: payuOrderData,
    isFirstPayment
  })

  const response = await fetch(orderUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payuOrderData),
    redirect: 'manual' // ⭐ KLUCZOWE: Wyłącz automatic redirect handling
  })

  console.log('PayU Subscription Order Response Status:', response.status)

  const responseText = await response.text()
  
  // Sprawdź czy PayU zwrócił HTML zamiast JSON (status 200)
  if (response.status === 200 && (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html'))) {
    console.log('PayU zwrócił HTML payment page dla subskrypcji - tworzymy redirect')
    
    // Generuj tymczasowy orderId dla HTML response
    const tempOrderId = `SUB-HTML-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Konstruuj redirectUri z oryginalnego URL-a i parametrów
    const redirectUri = `${orderUrl}?${Object.entries(payuOrderData)
      .filter(([key, value]) => 
        typeof value === 'string' && 
        !['buyer', 'products'].includes(key)
      )
      .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
      .join('&')}`

    return {
      orderId: tempOrderId,
      extOrderId: tempOrderId,
      status: {
        statusCode: 'SUCCESS' as const,
        statusDesc: 'Subscription order created in HTML mode'
      },
      redirectUri
    }
  }

  if (!response.ok) {
    console.error('PayU Subscription Order Error:', {
      status: response.status,
      response: responseText.substring(0, 1000)
    })
    
    if (response.status === 400) {
      try {
        const errorData = JSON.parse(responseText)
        const statusCode = errorData.status?.statusCode
        const statusDesc = errorData.status?.statusDesc
        
        if (statusDesc?.includes('SINGLE_CLICK_RECURRING_DISABLED')) {
          throw new Error('Płatności cykliczne są obecnie niedostępne w tym punkcie płatności')
        } else if (statusCode === 'ERROR_VALUE_INVALID') {
          throw new Error(`Nieprawidłowe dane subskrypcji: ${statusDesc || 'Sprawdź konfigurację płatności cyklicznych'}`)
        }
      } catch {
        // Jeśli nie można sparsować błędu, użyj ogólnego komunikatu
      }
    }
    
    throw new Error(`Błąd tworzenia subskrypcji PayU: ${response.status}`)
  }

  try {
    const responseData: PayUOrderCreateResponse = JSON.parse(responseText)
    console.log('PayU Subscription Order Success:', responseData)
    return responseData
  } catch {
    throw new Error('Nieprawidłowa odpowiedź JSON z PayU Subscription')
  }
}

/**
 * Weryfikuj podpis PayU webhook
 */
export function verifyPayUSignature(
  body: string,
  signature: string
): boolean {
  if (!PAYU_CONFIG.longKeyMD5) {
    throw new Error('Brak klucza MD5 dla PayU')
  }

  // PayU używa SHA-256 do podpisywania
  const expectedSignature = crypto
    .createHmac('sha256', PAYU_CONFIG.longKeyMD5)
    .update(body)
    .digest('hex')

  // Porównaj podpisy w sposób bezpieczny
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}

/**
 * Pobierz IP klienta z request headers
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const cfConnectingIp = headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp
  }
  
  // Fallback dla środowiska lokalnego
  return '127.0.0.1'
}

/**
 * Generuj unikalny extOrderId
 */
export function generateExtOrderId(planId: string, userId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${planId}-${userId}-${timestamp}-${random}`
}

/**
 * Mapuj plan subskrypcji na opis produktu
 */
export function getProductDescription(planId: string, billingCycle: 'monthly' | 'yearly'): string {
  const planNames = {
    basic: 'Plan Podstawowy',
    professional: 'Plan Profesjonalny', 
    enterprise: 'Plan Enterprise'
  }
  
  const cycleName = billingCycle === 'monthly' ? 'miesięczny' : 'roczny'
  const planName = planNames[planId as keyof typeof planNames] || 'Plan'
  
  return `${planName} - abonament ${cycleName} - Monitor Wizaro`
}

/**
 * Parsuj notyfikację PayU
 */
export function parsePayUNotification(body: string): PayUNotification {
  try {
    return JSON.parse(body)
  } catch {
    throw new Error('Nieprawidłowy format notyfikacji PayU')
  }
}

/**
 * Sprawdź czy płatność została zakończona pomyślnie
 */
export function isPaymentCompleted(status: string): boolean {
  return status === 'COMPLETED'
}

/**
 * Sprawdź czy płatność została anulowana
 */
export function isPaymentCanceled(status: string): boolean {
  return status === 'CANCELED'
}

/**
 * Sprawdź czy płatność oczekuje na realizację
 */
export function isPaymentPending(status: string): boolean {
  return status === 'PENDING' || status === 'NEW'
}

/**
 * Sprawdź czy płatność została odrzucona
 */
export function isPaymentRejected(status: string): boolean {
  return status === 'REJECTED'
}

/**
 * Sprawdź czy płatność wymaga działania 3DS
 */
export function isPaymentWaiting3DS(status: string): boolean {
  return status === 'WAITING_FOR_CONFIRMATION'
}

/**
 * Pobierz opis statusu płatności w języku polskim
 */
export function getPaymentStatusDescription(status: string): string {
  const statusDescriptions: Record<string, string> = {
    'NEW': 'Nowe zamówienie',
    'PENDING': 'Oczekuje na płatność',
    'WAITING_FOR_CONFIRMATION': 'Oczekuje na potwierdzenie 3DS',
    'COMPLETED': 'Płatność zakończona pomyślnie',
    'CANCELED': 'Płatność anulowana',
    'REJECTED': 'Płatność odrzucona'
  }
  
  return statusDescriptions[status] || `Nieznany status: ${status}`
}
