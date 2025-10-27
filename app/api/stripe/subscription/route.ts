// API endpoint dla subskrypcji Stripe - zastępuje PayU
// Adaptacja z /api/payu/subscription/route.ts do użycia ze Stripe

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  createStripeSubscription,
  type StripeCustomerData,
  type CreateSubscriptionRequest,
  generateExtOrderId
} from '@/lib/stripe/utils';
import { validateStripeConfig } from '@/lib/stripe/config';

// Interfejs zgodny z obecną strukturą Twojej aplikacji
interface CreateSubscriptionAPIRequest {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  amount: number; // kwota w groszach (dla kompatybilności)
  customerData: StripeCustomerData;
  paymentMethod?: string; // dla kompatybilności z PayU
}

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Sprawdź autentykację użytkownika
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      );
    }

    // Pobierz subskrypcję użytkownika z bazy danych
    const { data: subscription, error: dbError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbError && dbError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Błąd pobierania subskrypcji z bazy:', dbError);
      return NextResponse.json(
        { error: 'Błąd podczas pobierania subskrypcji' },
        { status: 500 }
      );
    }

    if (!subscription) {
      return NextResponse.json({
        subscription: null,
        hasActiveSubscription: false
      });
    }

    return NextResponse.json({
      subscription,
      hasActiveSubscription: subscription.status === 'active'
    });

  } catch (error) {
    console.error('Błąd pobierania subskrypcji:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania subskrypcji' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Walidacja konfiguracji Stripe
    validateStripeConfig();

    const supabase = await createClient();
    
    // Sprawdź autentykację użytkownika
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      );
    }

    // Parsuj dane z requestu
    const requestBody: CreateSubscriptionAPIRequest = await request.json();
    
    const {
      planId,
      billingCycle,
      customerData,
    } = requestBody;

    // Walidacja podstawowych danych
    if (!planId || !billingCycle || !customerData?.email) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych danych: planId, billingCycle, customerData.email' },
        { status: 400 }
      );
    }

    // Pobierz szczegóły planu z bazy danych
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !planData) {
      return NextResponse.json(
        { error: 'Nieprawidłowy lub nieaktywny plan' },
        { status: 400 }
      );
    }

    const validCycles = ['monthly', 'yearly'];
    if (!validCycles.includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Nieprawidłowy okres rozliczeniowy' },
        { status: 400 }
      );
    }

    // Sprawdź czy użytkownik nie ma już aktywnej subskrypcji
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Użytkownik ma już aktywną subskrypcję' },
        { status: 400 }
      );
    }

    // Generuj unikalny ID zamówienia (dla kompatybilności z obecną strukturą)
    const extOrderId = generateExtOrderId(planId, user.id);

    // Oblicz kwotę na podstawie danych z bazy (konwertuj PLN na grosze dla Stripe)
    const amount = Math.round((billingCycle === 'monthly' 
      ? planData.price_monthly_gross 
      : planData.price_yearly_gross) * 100);

    console.log('🔍 DEBUG - Dane planu z bazy:', {
      planId: planData.id,
      display_name: planData.display_name,
      price_monthly_gross: planData.price_monthly_gross,
      price_yearly_gross: planData.price_yearly_gross,
      billingCycle,
      selectedAmount: billingCycle === 'monthly' ? planData.price_monthly_gross : planData.price_yearly_gross,
      finalAmount: amount
    });

    console.log('Tworzenie subskrypcji Stripe dla:', {
      planId,
      billingCycle,
      userId: user.id,
      email: customerData.email,
      amount,
      extOrderId
    });

    // Przygotuj request dla Stripe
    const stripeRequest: CreateSubscriptionRequest = {
      planId: planId as 'basic' | 'professional' | 'enterprise', // Type assertion - validowane wyżej
      billingCycle: billingCycle as 'monthly' | 'yearly', // Type assertion - validowane wyżej
      customerData,
      userId: user.id,
      amount: amount, // Przekaż kwotę z bazy danych
      metadata: {
        ext_order_id: extOrderId,
        source: 'wizaro_app',
        plan_display_name: planData.display_name,
        amount_gross: amount.toString(),
      }
    };

    // Utwórz subskrypcję w Stripe
    const stripeResponse = await createStripeSubscription(stripeRequest);

    // Zapisz zamówienie subskrypcji w bazie danych (używamy tej samej struktury co PayU)
    const { error: dbError } = await supabase
      .from('payment_orders')
      .insert({
        ext_order_id: extOrderId,
        user_id: user.id,
        payu_order_id: stripeResponse.sessionId, // używamy sessionId jako order_id
        plan_id: planId,
        billing_cycle: billingCycle,
        amount: amount, // kwota z bazy danych w groszach
        currency: 'PLN',
        status: 'PENDING',
        redirect_uri: stripeResponse.url,
        customer_data: customerData,
        payu_response: { // zachowujemy strukturę ale z danymi Stripe
          sessionId: stripeResponse.sessionId,
          customerId: stripeResponse.customerId,
          provider: 'stripe'
        },
        is_subscription: true,
        is_first_payment: true,
      });

    if (dbError) {
      console.error('Błąd zapisywania zamówienia subskrypcji:', dbError);
      // Nie przerywamy procesu - session w Stripe został utworzony
    } else {
      console.log('✅ Zamówienie subskrypcji zapisane w bazie danych');
    }

    // Zwróć odpowiedź w formacie kompatybilnym z PayU
    return NextResponse.json({
      success: true,
      redirectUri: stripeResponse.url,
      sessionId: stripeResponse.sessionId,
      customerId: stripeResponse.customerId,
      extOrderId,
      isSubscription: true,
      provider: 'stripe'
    });

  } catch (error) {
    console.error('Błąd tworzenia subskrypcji Stripe:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Wystąpił błąd podczas tworzenia subskrypcji' 
      },
      { status: 500 }
    );
  }
}

