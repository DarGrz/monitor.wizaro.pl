import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBillingPortalSession, getCustomerByEmail } from '@/lib/stripe/utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Sprawdź czy użytkownik jest zalogowany
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { returnUrl } = await request.json();

    // Znajdź klienta w Stripe
    const customer = await getCustomerByEmail(user.email!);
    
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Utwórz sesję billing portal
    const portalSession = await createBillingPortalSession(
      customer.id,
      returnUrl || `${request.nextUrl.origin}/dashboard`
    );

    return NextResponse.json({ 
      url: portalSession.url 
    });

  } catch (error) {
    console.error('Error creating billing portal session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
