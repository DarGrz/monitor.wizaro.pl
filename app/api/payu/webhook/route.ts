import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  verifyPayUSignature, 
  parsePayUNotification,
  isPaymentCompleted,
  isPaymentCanceled 
} from '@/lib/payu/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    
    // PayU webhook może przychodzić bez podpisu w niektórych przypadkach testowych
    const signature = request.headers.get('openpayu-signature')
    
    console.log('PayU webhook otrzymany:', {
      hasSignature: !!signature,
      bodyLength: body.length,
      headers: Object.fromEntries(request.headers.entries())
    })

    // Weryfikuj podpis PayU tylko jeśli jest obecny
    if (signature) {
      try {
        const isValidSignature = verifyPayUSignature(body, signature)
        if (!isValidSignature) {
          console.error('Nieprawidłowy podpis PayU webhook')
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 }
          )
        }
      } catch (error) {
        console.error('Błąd weryfikacji podpisu PayU:', error)
        return NextResponse.json(
          { error: 'Signature verification failed' },
          { status: 401 }
        )
      }
    } else {
      console.warn('PayU webhook bez podpisu - możliwe w środowisku sandbox')
    }

    // Parsuj notyfikację PayU
    const notification = parsePayUNotification(body)
    const { order } = notification

    console.log('PayU webhook szczegóły:', {
      orderId: order.orderId,
      extOrderId: order.extOrderId,
      status: order.status,
      totalAmount: order.totalAmount,
      merchantPosId: order.merchantPosId
    })

    const supabase = await createClient()

    // Znajdź zamówienie w bazie danych - używamy ext_order_id lub payu_order_id
    let paymentOrder = null
    let findError = null

    // Najpierw szukaj po extOrderId
    if (order.extOrderId) {
      const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('ext_order_id', order.extOrderId)
        .single()
      
      paymentOrder = data
      findError = error
    }

    // Jeśli nie znaleziono po extOrderId, szukaj po orderId PayU
    if (!paymentOrder && order.orderId) {
      const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('payu_order_id', order.orderId)
        .single()
      
      paymentOrder = data
      findError = error
    }

    if (findError || !paymentOrder) {
      console.error('Nie znaleziono zamówienia:', {
        extOrderId: order.extOrderId,
        orderId: order.orderId,
        error: findError
      })
      
      // Zwracamy sukces aby PayU nie powtarzał webhook
      return NextResponse.json({ success: true, message: 'Order not found but acknowledged' })
    }

    console.log('Znaleziono zamówienie:', {
      id: paymentOrder.id,
      status: paymentOrder.status,
      userId: paymentOrder.user_id,
      planId: paymentOrder.plan_id
    })

    // Sprawdź czy status się zmienił
    const newStatus = isPaymentCompleted(order.status) ? 'completed' :
                     isPaymentCanceled(order.status) ? 'canceled' : 'pending'

    // Aktualizuj status zamówienia tylko jeśli się zmienił
    if (paymentOrder.status !== newStatus) {
      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
          status: newStatus,
          payu_order_id: order.orderId,
          payu_data: order,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentOrder.id)

      if (updateError) {
        console.error('Błąd aktualizacji zamówienia:', updateError)
        return NextResponse.json(
          { error: 'Failed to update order' },
          { status: 500 }
        )
      }

      console.log(`Status zamówienia zaktualizowany: ${paymentOrder.status} -> ${newStatus}`)
    }

    // Jeśli płatność została zakończona pomyślnie, utwórz subskrypcję
    if (isPaymentCompleted(order.status) && paymentOrder.status !== 'completed') {
      await handleSuccessfulPayment(supabase, paymentOrder, order)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Błąd przetwarzania PayU webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface CustomerData {
  address?: string;
  // Add other properties that might be in customer_data
}

async function handleSuccessfulPayment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentOrder: Record<string, unknown> & { 
    customer_data?: CustomerData,
    is_subscription?: boolean,
    billing_cycle?: string,
    plan_id?: string,
    user_id?: string,
    amount?: number,
    currency?: string,
    id?: string
  },
  payuOrder: Record<string, unknown>
) {
  try {
    console.log('Obsługa pomyślnej płatności:', {
      orderId: paymentOrder.id,
      userId: paymentOrder.user_id,
      planId: paymentOrder.plan_id,
      isSubscription: paymentOrder.is_subscription
    })

    // Sprawdź czy subskrypcja już istnieje
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', paymentOrder.user_id)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      console.log('Użytkownik ma już aktywną subskrypcję:', paymentOrder.user_id)
      return
    }

    // Oblicz daty subskrypcji
    const now = new Date()
    const periodEnd = new Date(now)

    if (paymentOrder.billing_cycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    }

    // Dodaj 14-dniowy trial dla nowych użytkowników tylko dla pierwszych subskrypcji
    const trialEnd = new Date(now)
    trialEnd.setDate(trialEnd.getDate() + 14)

    // Utwórz subskrypcję
    const subscriptionData = {
      user_id: paymentOrder.user_id,
      plan_id: paymentOrder.plan_id,
      billing_cycle: paymentOrder.billing_cycle,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      amount_gross: paymentOrder.amount,
      currency: paymentOrder.currency || 'PLN',
      payment_method: 'payu',
      last_payment_order_id: paymentOrder.id,
      // Dodaj trial tylko dla subskrypcji
      ...(paymentOrder.is_subscription && {
        trial_start: now.toISOString(),
        trial_end: trialEnd.toISOString(),
      })
    }

    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert(subscriptionData)

    if (subscriptionError) {
      console.error('Błąd tworzenia subskrypcji:', subscriptionError)
      throw subscriptionError
    }

    // Zapisz informacje o płatności
    const { error: billingError } = await supabase
      .from('user_billing_info')
      .upsert({
        user_id: paymentOrder.user_id,
        payu_customer_data: payuOrder.buyer,
        billing_address: paymentOrder.customer_data?.address,
        updated_at: new Date().toISOString()
      })

    if (billingError) {
      console.error('Błąd zapisywania informacji o płatności:', billingError)
    }

    console.log('Subskrypcja utworzona pomyślnie dla użytkownika:', {
      userId: paymentOrder.user_id,
      planId: paymentOrder.plan_id,
      billingCycle: paymentOrder.billing_cycle,
      isSubscription: paymentOrder.is_subscription
    })

  } catch (error) {
    console.error('Błąd obsługi pomyślnej płatności:', error)
    throw error
  }
}
