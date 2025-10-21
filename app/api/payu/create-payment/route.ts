import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  createPayUOrder,
  getClientIp, 
  generateExtOrderId, 
  getProductDescription 
} from '@/lib/payu/utils'

interface CreatePaymentRequest {
  planId: string
  billingCycle: 'monthly' | 'yearly'
  amount: number
  paymentMethod?: string // Dodana opcjonalna metoda płatności
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
    const body: CreatePaymentRequest = await request.json()
    const { planId, billingCycle, amount, customerData } = body

    // Walidacja danych
    if (!planId || !billingCycle || !amount || !customerData?.email) {
      return NextResponse.json(
        { error: 'Brak wymaganych danych' },
        { status: 400 }
      )
    }

    // Sprawdź czy plan istnieje (podstawowa walidacja)
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

    // Przygotuj dane zamówienia dla PayU zgodnie z dokumentacją
    const orderData = {
      description: getProductDescription(planId, billingCycle),
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
          name: getProductDescription(planId, billingCycle),
          unitPrice: amount.toString(),
          quantity: '1'
        }
      ]
    }

    // Używamy prawdziwego PayU API zgodnie z dokumentacją
    console.log('Tworzenie zamówienia PayU dla:', {
      planId,
      billingCycle,
      amount,
      extOrderId
    })
    
    const payuResponse = await createPayUOrder(orderData, customerIp)

    if (payuResponse.status.statusCode !== 'SUCCESS') {
      throw new Error(`PayU Error: ${payuResponse.status.statusCode || 'Unknown error'}`)
    }

    // Zapisz zamówienie w bazie danych do śledzenia
    // Zapisz zamówienie w bazie danych z poprawionymi nazwami kolumn
    const { error: dbError } = await supabase
      .from('payment_orders')
      .insert({
        ext_order_id: extOrderId,
        user_id: user.id,
        payu_order_id: payuResponse.orderId,
        plan_id: planId,
        billing_cycle: billingCycle,
        amount: amount, // w groszach
        currency: 'PLN',
        status: 'PENDING',
        redirect_uri: payuResponse.redirectUri,
        customer_data: customerData,
        payu_response: payuResponse
      })

    if (dbError) {
      console.error('Błąd zapisywania zamówienia w bazie:', dbError)
      // Nie przerywamy procesu - zamówienie w PayU zostało utworzone
    }

    return NextResponse.json({
      success: true,
      redirectUri: payuResponse.redirectUri,
      orderId: payuResponse.orderId,
      extOrderId
    })

  } catch (error) {
    console.error('Błąd tworzenia płatności PayU:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Wystąpił błąd podczas tworzenia płatności' 
      },
      { status: 500 }
    )
  }
}
