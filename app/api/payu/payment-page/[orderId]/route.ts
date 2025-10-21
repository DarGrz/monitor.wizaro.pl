import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPayUAccessToken } from '@/lib/payu/utils'
import { PAYU_CONFIG } from '@/lib/payu/config'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params
    
    console.log('PayU Payment Page Request for orderId:', orderId)

    // Sprawdź czy orderId to HTML order (generowany przez naszą funkcję)
    if (!orderId.startsWith('HTML-')) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Sprawdź autoryzację użytkownika
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.redirect('/login')
    }

    // Pobierz dane zamówienia z bazy danych
    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('payu_order_id', orderId)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    console.log('Znaleziono zamówienie:', order.ext_order_id)

    // Przygotuj dane do POST request do PayU
    const accessToken = await getPayUAccessToken()
    
    const payuOrderData = {
      notifyUrl: `https://monitor.wizaro.pl/api/payu/webhook`,
      continueUrl: `https://monitor.wizaro.pl/payment-success`,
      customerIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1',
      merchantPosId: PAYU_CONFIG.posId!,
      description: `Plan ${order.plan_id} - Monitor Wizaro`,
      currencyCode: order.currency,
      totalAmount: order.amount.toString(),
      extOrderId: order.ext_order_id,
      buyer: order.customer_data,
      products: [
        {
          name: `Plan ${order.plan_id} - Monitor Wizaro`,
          unitPrice: order.amount.toString(),
          quantity: '1'
        }
      ]
    }

    // Wykonaj POST request do PayU
    const orderUrl = PAYU_CONFIG.isSandbox 
      ? 'https://secure.snd.payu.com/api/v2_1/orders'
      : 'https://secure.payu.com/api/v2_1/orders'

    const response = await fetch(orderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payuOrderData),
      redirect: 'manual'
    })

    console.log('PayU Response Status:', response.status)

    // Jeśli PayU zwrócił redirect (302), przekieruj użytkownika
    if (response.status === 302) {
      const redirectUri = response.headers.get('Location')
      if (redirectUri) {
        return NextResponse.redirect(redirectUri)
      }
    }

    // Jeśli PayU zwrócił HTML, wyświetl go użytkownikowi
    if (response.status === 200) {
      const htmlContent = await response.text()
      
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    }

    // Jeśli PayU zwrócił JSON (201), przekieruj na redirectUri
    if (response.status === 201) {
      const jsonResponse = await response.json()
      if (jsonResponse.redirectUri) {
        return NextResponse.redirect(jsonResponse.redirectUri)
      }
    }

    // Fallback
    return NextResponse.json(
      { error: 'Unexpected PayU response' },
      { status: 500 }
    )

  } catch (error) {
    console.error('Błąd PayU payment page:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Wystąpił błąd podczas ładowania strony płatności' 
      },
      { status: 500 }
    )
  }
}