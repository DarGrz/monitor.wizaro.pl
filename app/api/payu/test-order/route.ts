import { NextResponse } from 'next/server'
import { createPayUOrder } from '@/lib/payu/utils'
import { PAYU_CONFIG } from '@/lib/payu/config'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    console.log('🧪 Test zamówienia PayU z obsługą HTML/JSON')
    
    const supabase = await createClient()

    // Sprawdź autoryzację użytkownika (dla testu - pobierz pierwszego dostępnego)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login first' },
        { status: 401 }
      )
    }
    
    // Użyj naszej funkcji createPayUOrder
    const result = await createPayUOrder({
      customerIp: '8.8.8.8',
      description: 'Test Order Monitor Wizaro',
      currencyCode: 'PLN',
      totalAmount: '1000',
      extOrderId: 'test-' + Date.now(),
      buyer: {
        email: user.email || 'test@monitor.wizaro.pl',
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
    })
    
    console.log('✅ Zamówienie utworzone:', result)

    // Zapisz zamówienie w bazie danych (tylko dla HTML orders)
    if (result.orderId && result.orderId.startsWith('HTML-')) {
      const { error: dbError } = await supabase
        .from('payment_orders')
        .insert({
          ext_order_id: result.extOrderId,
          user_id: user.id,
          payu_order_id: result.orderId,
          plan_id: 'test',
          billing_cycle: 'monthly',
          amount: 1000,
          currency: 'PLN',
          status: 'PENDING',
          redirect_uri: result.redirectUri,
          customer_data: {
            email: user.email || 'test@monitor.wizaro.pl',
            firstName: 'Test',
            lastName: 'User'
          },
          payu_response: result
        })

      if (dbError) {
        console.error('Błąd zapisywania test zamówienia:', dbError)
      } else {
        console.log('✅ Test zamówienie zapisane w bazie')
      }
    }

    return NextResponse.json({
      success: true,
      result,
      config: {
        environment: PAYU_CONFIG.isSandbox ? 'sandbox' : 'production',
        posId: PAYU_CONFIG.posId
      }
    })
  } catch (error) {
    console.error('Błąd testu:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}