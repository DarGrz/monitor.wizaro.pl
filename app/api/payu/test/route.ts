import { NextResponse } from 'next/server'
import { getPayUAccessToken, validatePayUConfig } from '@/lib/payu/utils'
import { PAYU_CONFIG } from '@/lib/payu/config'

export async function GET() {
  try {
    console.log('Testowanie konfiguracji PayU...')
    
    // Test walidacji konfiguracji
    const configValidation = validatePayUConfig()
    
    // Test konfiguracji
    const config = {
      environment: process.env.PAYU_ENVIRONMENT || 'sandbox',
      isSandbox: PAYU_CONFIG.isSandbox,
      apiUrl: PAYU_CONFIG.apiUrl,
      posId: PAYU_CONFIG.posId ? '***' + PAYU_CONFIG.posId.slice(-4) : 'BRAK',
      clientId: PAYU_CONFIG.oauthClientId ? '***' + PAYU_CONFIG.oauthClientId.slice(-4) : 'BRAK',
      hasClientSecret: !!PAYU_CONFIG.oauthClientSecret,
      hasLongKey: !!PAYU_CONFIG.longKeyMD5,
      configValid: configValidation.isValid,
      configErrors: configValidation.errors
    }

    console.log('Konfiguracja PayU:', config)

    // Test OAuth tylko jeśli konfiguracja jest prawidłowa
    let tokenResult = null
    let tokenError = null

    if (configValidation.isValid) {
      try {
        const token = await getPayUAccessToken()
        tokenResult = {
          success: true,
          tokenPrefix: token.substring(0, 8) + '...',
          tokenLength: token.length
        }
      } catch (error) {
        tokenError = error instanceof Error ? error.message : 'Nieznany błąd OAuth'
      }
    } else {
      tokenError = `Błędna konfiguracja: ${configValidation.errors.join(', ')}`
    }

    // Test URL-i
    const urls = {
      oauth: PAYU_CONFIG.isSandbox 
        ? 'https://secure.snd.payu.com/pl/standard/user/oauth/authorize'
        : 'https://secure.payu.com/pl/standard/user/oauth/authorize',
      api: PAYU_CONFIG.apiUrl,
      orders: `${PAYU_CONFIG.apiUrl}/orders`
    }

    return NextResponse.json({
      success: true,
      config,
      oauth: {
        result: tokenResult,
        error: tokenError
      },
      urls,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Błąd testowania PayU:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
