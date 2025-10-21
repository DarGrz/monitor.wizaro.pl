// Konfiguracja PayU
export const PAYU_CONFIG = {
  // Używamy sandbox gdy PAYU_ENVIRONMENT nie jest ustawione na 'production'
  isSandbox: process.env.PAYU_ENVIRONMENT !== 'production',
  
  // URLs API - używamy oficjalnych URL-i PayU
  apiUrl: process.env.PAYU_ENVIRONMENT === 'production' 
    ? 'https://secure.payu.com/api/v2_1' 
    : 'https://secure.snd.payu.com/api/v2_1',
  
  // Dane dostępowe - wybieramy sandbox lub produkcję
  posId: process.env.PAYU_ENVIRONMENT === 'production' 
    ? process.env.PAYU_POS_ID 
    : process.env.PAYU_SANDBOX_POS_ID,
    
  longKeyMD5: process.env.PAYU_ENVIRONMENT === 'production' 
    ? process.env.PAYU_LONG_KEY_MD5 
    : process.env.PAYU_SANDBOX_LONG_KEY_MD5,
    
  oauthClientId: process.env.PAYU_ENVIRONMENT === 'production' 
    ? process.env.PAYU_OAUTH_CLIENT_ID 
    : process.env.PAYU_SANDBOX_OAUTH_CLIENT_ID,
    
  oauthClientSecret: process.env.PAYU_ENVIRONMENT === 'production' 
    ? process.env.PAYU_OAUTH_CLIENT_SECRET 
    : process.env.PAYU_SANDBOX_OAUTH_CLIENT_SECRET,
}

// URLs powrotu
export const PAYU_RETURN_URLS = {
  continueUrl: process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`
    : 'http://localhost:3000/dashboard?payment=success',
    
  notifyUrl: process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payu/webhook`
    : 'http://localhost:3000/api/payu/webhook',
}

// Typy płatności PayU - zgodnie z dokumentacją PayU API
export interface PayUProduct {
  name: string
  unitPrice: string // PayU API wymaga string dla cen
  quantity: string // PayU API wymaga string dla ilości
  virtual?: boolean
}

export interface PayUBuyer {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  language?: string
}

export interface PayUOrderCreateRequest {
  merchantPosId: string
  description: string
  currencyCode: string
  totalAmount: string // PayU API wymaga string dla kwot
  buyer: PayUBuyer
  products: PayUProduct[]
  continueUrl: string
  notifyUrl: string
  customerIp: string
  extOrderId?: string
  // Dodane pola dla płatności cyklicznych
  recurring?: 'FIRST' | 'STANDARD'
  cardOnFile?: 'FIRST' | 'STANDARD'
}

export interface PayUOrderCreateResponse {
  status: {
    statusCode: string
    statusDesc?: string
  }
  redirectUri?: string
  orderId?: string
  extOrderId?: string
}

export interface PayUAccessTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  grant_type: string
}

export interface PayUNotification {
  order: {
    orderId: string
    extOrderId?: string
    orderCreateDate: string
    notifyUrl: string
    customerIp: string
    merchantPosId: string
    description: string
    currencyCode: string
    totalAmount: number
    status: string
    products: PayUProduct[]
    buyer?: PayUBuyer
  }
  localReceiptDateTime?: string
  properties?: Array<{
    name: string
    value: string
  }>
}

export interface PayUOrderDetailsResponse {
  orders: Array<{
    orderId: string
    extOrderId?: string
    orderCreateDate: string
    notifyUrl: string
    customerIp: string
    merchantPosId: string
    description: string
    currencyCode: string
    totalAmount: string
    status: string
    products: PayUProduct[]
    buyer?: PayUBuyer
  }>
  status: {
    statusCode: string
    statusDesc?: string
  }
  properties?: Array<{
    name: string
    value: string
  }>
}
