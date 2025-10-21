import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  createPayUSubscriptionOrder,
  getClientIp, 
  generateExtOrderId, 
  getProductDescription 
} from '@/lib/payu/utils'

interface CreateSubscriptionRequest {
  planId: string
  billingCycle: 'monthly' | 'yearly'
  amount: number
  customerData: {
    email: string
    firstName?: string
    companyName?: string
    nip?: string
    address?: {
      street: string
      buildingNumber: string
      apartmentNumber?: string
      city: string
      zipCode: string
    }
  }
}

export async function GET() {
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

    // Pobierz aktywną subskrypcję użytkownika
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (
          name,
          display_name,
          max_companies,
          max_opinion_removals_monthly,
          has_negative_monitoring,
          has_weekly_reports,
          has_email_notifications,
          has_instant_notifications
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    return NextResponse.json({
      subscription: subscription || null
    })

  } catch (error) {
    console.error('Błąd podczas pobierania subskrypcji:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Wystąpił błąd podczas pobierania subskrypcji' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Pobierz dane z request
    const body: CreateSubscriptionRequest = await request.json()
    const { planId, billingCycle, amount, customerData } = body

    // Walidacja danych
    if (!planId || !billingCycle || !amount || !customerData?.email) {
      return NextResponse.json(
        { error: 'Brak wymaganych danych' },
        { status: 400 }
      )
    }

    // Sprawdź czy plan istnieje
    const validPlans = ['basic', 'professional', 'enterprise']
    if (!validPlans.includes(planId)) {
      return NextResponse.json(
        { error: 'Nieprawidłowy plan' },
        { status: 400 }
      )
    }

    // Sprawdź czy użytkownik nie ma już aktywnej subskrypcji
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Użytkownik ma już aktywną subskrypcję' },
        { status: 400 }
      )
    }

    // Pobierz IP klienta
    const customerIp = getClientIp(request.headers)

    // Generuj unikalny ID zamówienia
    const extOrderId = generateExtOrderId(planId, user.id)

    // Przygotuj dane zamówienia subskrypcji dla PayU
    const orderData = {
      description: `${getProductDescription(planId, billingCycle)} - Pierwsza płatność`,
      currencyCode: 'PLN',
      totalAmount: amount.toString(),
      customerIp,
      extOrderId,
      buyer: {
        email: customerData.email,
        firstName: customerData.firstName || customerData.companyName || 'Klient',
        lastName: 'Monitor Wizaro',
        phone: '123456789',
        language: 'pl'
      },
      products: [
        {
          name: `${getProductDescription(planId, billingCycle)} - Subskrypcja`,
          unitPrice: amount.toString(),
          quantity: '1'
        }
      ]
    }

    // Używamy PayU API dla subskrypcji z pierwszą płatnością
    console.log('Tworzenie subskrypcji PayU dla:', {
      planId,
      billingCycle,
      amount,
      extOrderId
    })
    
    const payuResponse = await createPayUSubscriptionOrder(orderData, customerIp, true)

    if (payuResponse.status.statusCode !== 'SUCCESS') {
      throw new Error(`PayU Error: ${payuResponse.status.statusCode || 'Unknown error'}`)
    }

    // Zapisz zamówienie subskrypcji w bazie danych
    const { error: dbError } = await supabase
      .from('payment_orders')
      .insert({
        ext_order_id: extOrderId,
        user_id: user.id,
        payu_order_id: payuResponse.orderId,
        plan_id: planId,
        billing_cycle: billingCycle,
        amount: amount,
        currency: 'PLN',
        status: 'PENDING',
        redirect_uri: payuResponse.redirectUri,
        customer_data: customerData,
        payu_response: payuResponse,
        is_subscription: true, // Oznacz jako subskrypcję
        is_first_payment: true // Pierwsza płatność subskrypcji
      })

    if (dbError) {
      console.error('Błąd zapisywania zamówienia subskrypcji:', dbError)
      // Nie przerywamy procesu - zamówienie w PayU zostało utworzone
    }

    return NextResponse.json({
      success: true,
      redirectUri: payuResponse.redirectUri,
      orderId: payuResponse.orderId,
      extOrderId,
      isSubscription: true
    })

  } catch (error) {
    console.error('Błąd tworzenia subskrypcji PayU:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Wystąpił błąd podczas tworzenia subskrypcji' 
      },
      { status: 500 }
    )
  }
}
