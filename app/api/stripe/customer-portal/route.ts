// API endpoint dla portalu klienta Stripe
// Pozwala użytkownikom zarządzać swoją subskrypcją

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCustomerPortalUrl } from '@/lib/stripe/utils';

export async function POST() {
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

    // Pobierz subskrypcję użytkownika z Stripe Customer ID
    const { data: subscription, error: dbError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (dbError || !subscription) {
      return NextResponse.json(
        { error: 'Nie znaleziono aktywnej subskrypcji' },
        { status: 404 }
      );
    }

    if (!subscription.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Brak ID klienta Stripe' },
        { status: 400 }
      );
    }

    // Utwórz URL do portalu klienta
    const portalUrl = await createCustomerPortalUrl(subscription.stripe_customer_id);

    return NextResponse.json({
      url: portalUrl
    });

  } catch (error) {
    console.error('Błąd tworzenia portalu zarządzania:', error);
    return NextResponse.json(
      { error: 'Nie udało się utworzyć portalu zarządzania subskrypcją' },
      { status: 500 }
    );
  }
}