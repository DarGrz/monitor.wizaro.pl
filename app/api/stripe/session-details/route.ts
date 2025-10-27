// API endpoint do pobierania szczegółów sesji Stripe dla strony sukcesu
// Bazuje na /api/payments/session-details/route.ts z dokumentacji

import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutSession, getStripeSubscription } from '@/lib/stripe/utils';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Pobierz szczegóły sesji ze Stripe
    const session = await getCheckoutSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Sprawdź status płatności
    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        status: session.payment_status,
        message: 'Płatność nie została zrealizowana'
      });
    }

    // Pobierz szczegóły subskrypcji jeśli istnieje
    let subscriptionDetails = null;
    if (session.subscription) {
      const subscription = await getStripeSubscription(session.subscription as string);
      if (subscription) {
        subscriptionDetails = {
          id: subscription.id,
          status: subscription.status,
          current_period_start: new Date((subscription as Stripe.Subscription & { current_period_start: number }).current_period_start * 1000).toISOString(),
          current_period_end: new Date((subscription as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000).toISOString(),
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          plan: subscription.items.data[0]?.price ? {
            id: subscription.items.data[0].price.id,
            nickname: subscription.items.data[0].price.nickname,
            amount: subscription.items.data[0].price.unit_amount || 0,
            currency: subscription.items.data[0].price.currency,
            interval: subscription.items.data[0].price.recurring?.interval || 'month',
          } : null,
        };
      }
    }

    // Przygotuj dane klienta
    const customerData = session.customer_details ? {
      email: session.customer_details.email || '',
      name: session.customer_details.name,
    } : null;

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        subscription_id: session.subscription as string,
        customer_id: session.customer as string,
        created: session.created,
      },
      subscription: subscriptionDetails,
      customer: customerData,
    });

  } catch (error) {
    console.error('❌ Session details error:', error);
    return NextResponse.json(
      { error: 'Błąd podczas pobierania szczegółów sesji' },
      { status: 500 }
    );
  }
}