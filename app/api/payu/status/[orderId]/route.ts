import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPayUOrder, getPaymentStatusDescription } from '@/lib/payu/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = await createClient()

    // Sprawdź autoryzację użytkownika
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderId } = params

    if (!orderId) {
      return NextResponse.json(
        { error: 'Brak ID zamówienia' },
        { status: 400 }
      )
    }

    // Znajdź zamówienie w bazie danych
    const { data: paymentOrder, error: findError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('user_id', user.id) // Upewnij się, że zamówienie należy do użytkownika
      .or(`ext_order_id.eq.${orderId},payu_order_id.eq.${orderId}`)
      .single()

    if (findError || !paymentOrder) {
      return NextResponse.json(
        { error: 'Zamówienie nie zostało znalezione' },
        { status: 404 }
      )
    }

    // Pobierz aktualny status z PayU
    let payuStatus = null
    let payuError = null

    try {
      if (paymentOrder.payu_order_id) {
        payuStatus = await getPayUOrder(paymentOrder.payu_order_id)
      }
    } catch (error) {
      console.error('Błąd pobierania statusu z PayU:', error)
      payuError = error instanceof Error ? error.message : 'Błąd PayU API'
    }

    // Przygotuj odpowiedź
    const response = {
      orderId: paymentOrder.ext_order_id,
      payuOrderId: paymentOrder.payu_order_id,
      status: paymentOrder.status,
      statusDescription: getPaymentStatusDescription(paymentOrder.status),
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      planId: paymentOrder.plan_id,
      billingCycle: paymentOrder.billing_cycle,
      createdAt: paymentOrder.created_at,
      updatedAt: paymentOrder.updated_at,
      redirectUri: paymentOrder.redirect_uri,
      isSubscription: paymentOrder.is_subscription || false,
      isFirstPayment: paymentOrder.is_first_payment || false,
      // Informacje z PayU (jeśli dostępne)
      payuStatus: payuStatus ? {
        status: payuStatus.orders?.[0]?.status,
        statusDescription: payuStatus.orders?.[0]?.status ? 
          getPaymentStatusDescription(payuStatus.orders[0].status) : undefined,
        orderCreateDate: payuStatus.orders?.[0]?.orderCreateDate
      } : null,
      payuError
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Błąd sprawdzania statusu płatności:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Wystąpił błąd podczas sprawdzania statusu płatności' 
      },
      { status: 500 }
    )
  }
}
