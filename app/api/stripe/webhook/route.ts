// Webhook Stripe dla subskrypcji - zastępuje PayU webhook
// Bazuje na /app/api/payu/webhook/route.ts ale dla eventów Stripe

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { constructWebhookEvent } from '@/lib/stripe/utils';
import Stripe from 'stripe';



export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ Brak podpisu Stripe webhook');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Weryfikuj podpis webhook
    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(body, signature);
    } catch (err) {
      console.error('❌ Błąd weryfikacji podpisu Stripe webhook:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    console.log('📨 Otrzymano event Stripe:', event.type, event.id);

    const supabase = await createClient();

    // Obsłuż różne typy eventów Stripe
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(supabase, event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(supabase, event.data.object as Stripe.Subscription);
        break;

      default:
        console.log('ℹ️ Nieobsługiwany typ eventu Stripe:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ Błąd obsługi webhook Stripe:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Obsłuż zakończenie checkout session - podobnie jak w PayU webhook
 */
async function handleCheckoutCompleted(
  supabase: Awaited<ReturnType<typeof createClient>>,
  session: Stripe.Checkout.Session
) {
  try {
    console.log('✅ Checkout session completed:', session.id);

    // Aktualizuj status payment_order na podstawie ext_order_id z metadata
    const extOrderId = session.metadata?.ext_order_id;
    
    if (extOrderId) {
      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
          status: 'COMPLETED',
          payu_response: {
            sessionId: session.id,
            customerId: session.customer,
            subscriptionId: session.subscription,
            provider: 'stripe',
            completedAt: new Date().toISOString(),
          }
        })
        .eq('ext_order_id', extOrderId);

      if (updateError) {
        console.error('❌ Błąd aktualizacji payment_order:', updateError);
      } else {
        console.log('✅ Status payment_order zaktualizowany na COMPLETED');
      }
    }

    // Jeśli to subskrypcja, utwórz lub zaktualizuj rekord w user_subscriptions
    if (session.mode === 'subscription' && session.subscription) {
      await createOrUpdateSubscription(supabase, session);
    }

  } catch (error) {
    console.error('Błąd obsługi checkout completed:', error);
    throw error;
  }
}

/**
 * Obsłuż aktualizację subskrypcji
 */
async function handleSubscriptionUpdated(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subscription: Stripe.Subscription
) {
  try {
    console.log('🔄 Aktualizacja subskrypcji:', subscription.id);

    const userId = subscription.metadata?.user_id;
    if (!userId) {
      console.error('❌ Brak user_id w metadata subskrypcji');
      return;
    }

    // Przygotuj dane do aktualizacji
    const subscriptionData = {
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: mapStripeStatusToLocal(subscription.status),
      current_period_start: new Date((subscription as Stripe.Subscription & { current_period_start: number }).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000).toISOString(),
      ...(subscription.trial_start && {
        trial_start: new Date(subscription.trial_start * 1000).toISOString()
      }),
      ...(subscription.trial_end && {
        trial_end: new Date(subscription.trial_end * 1000).toISOString()
      }),
      payment_method: 'stripe',
      updated_at: new Date().toISOString(),
    };

    // Sprawdź czy subskrypcja już istnieje
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (existingSubscription) {
      // Zaktualizuj istniejącą subskrypcję
      const { error } = await supabase
        .from('user_subscriptions')
        .update(subscriptionData)
        .eq('id', existingSubscription.id);

      if (error) {
        console.error('❌ Błąd aktualizacji subskrypcji:', error);
      } else {
        console.log('✅ Subskrypcja zaktualizowana');
      }
    } else {
      // Utwórz nową subskrypcję jeśli nie istnieje
      const newSubscriptionData = {
        ...subscriptionData,
        user_id: userId,
        plan_id: subscription.metadata?.plan_id || 'basic',
        billing_cycle: subscription.metadata?.billing_cycle || 'monthly',
        currency: 'PLN',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_subscriptions')
        .insert(newSubscriptionData);

      if (error) {
        console.error('❌ Błąd tworzenia subskrypcji:', error);
      } else {
        console.log('✅ Nowa subskrypcja utworzona');
      }
    }

  } catch (error) {
    console.error('Błąd obsługi aktualizacji subskrypcji:', error);
    throw error;
  }
}

/**
 * Obsłuż usunięcie subskrypcji
 */
async function handleSubscriptionDeleted(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subscription: Stripe.Subscription
) {
  try {
    console.log('🗑️ Subskrypcja usunięta:', subscription.id);

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('❌ Błąd anulowania subskrypcji:', error);
    } else {
      console.log('✅ Subskrypcja oznaczona jako anulowana');
    }

  } catch (error) {
    console.error('Błąd obsługi usunięcia subskrypcji:', error);
    throw error;
  }
}

/**
 * Obsłuż pomyślną płatność faktury
 */
async function handleInvoicePaymentSucceeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: Stripe.Invoice
) {
  try {
    console.log('💰 Płatność faktury pomyślna:', invoice.id);

    const subscriptionId = (invoice as Stripe.Invoice & { subscription: string }).subscription;
    if (subscriptionId) {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          last_payment_date: new Date().toISOString(),
          last_payment_status: 'succeeded',
          payment_attempts: 0, // Resetuj licznik nieudanych prób
          status: 'active', // Upewnij się że status jest aktywny
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId);

      if (error) {
        console.error('❌ Błąd aktualizacji po pomyślnej płatności:', error);
      } else {
        console.log('✅ Subskrypcja zaktualizowana po pomyślnej płatności');
      }
    }

  } catch (error) {
    console.error('Błąd obsługi pomyślnej płatności faktury:', error);
    throw error;
  }
}

/**
 * Obsłuż nieudaną płatność faktury
 */
async function handleInvoicePaymentFailed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: Stripe.Invoice
) {
  try {
    console.log('❌ Płatność faktury nieudana:', invoice.id);

    const subscriptionId = (invoice as Stripe.Invoice & { subscription: string }).subscription;
    if (subscriptionId) {
      // Zwiększ licznik nieudanych prób płatności
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('payment_attempts')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      const currentAttempts = subscription?.payment_attempts || 0;
      const newAttempts = currentAttempts + 1;

      // Po 3 nieudanych próbach zmień status na past_due
      const newStatus = newAttempts >= 3 ? 'past_due' : 'active';

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          last_payment_status: 'failed',
          payment_attempts: newAttempts,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId);

      if (error) {
        console.error('❌ Błąd aktualizacji po nieudanej płatności:', error);
      } else {
        console.log(`✅ Subskrypcja zaktualizowana po nieudanej płatności (próba ${newAttempts})`);
      }
    }

  } catch (error) {
    console.error('Błąd obsługi nieudanej płatności faktury:', error);
    throw error;
  }
}

/**
 * Obsłuż zbliżający się koniec trial
 */
async function handleTrialWillEnd(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subscription: Stripe.Subscription
) {
  try {
    console.log('⏰ Trial kończy się za 3 dni:', subscription.id);

    // Tutaj możesz dodać logikę wysyłania emaili przypominających
    // o zbliżającym się końcu okresu trial

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('❌ Błąd aktualizacji subskrypcji (trial ending):', error);
    }

  } catch (error) {
    console.error('Błąd obsługi końca trial:', error);
    throw error;
  }
}

/**
 * Utwórz lub zaktualizuj subskrypcję na podstawie sesji checkout
 */
async function createOrUpdateSubscription(
  supabase: Awaited<ReturnType<typeof createClient>>,
  session: Stripe.Checkout.Session
) {
  try {
    const userId = session.metadata?.user_id;
    const planId = session.metadata?.plan_id;
    const billingCycle = session.metadata?.billing_cycle;

    if (!userId || !planId || !billingCycle) {
      console.error('❌ Brak wymaganych danych w metadata sesji');
      return;
    }

    // Sprawdź czy subskrypcja już istnieje
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      console.log('⚠️ Użytkownik ma już aktywną subskrypcję, pomijam tworzenie nowej');
      return;
    }

    // Oblicz daty okresu subskrypcji
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14); // 14 dni trial

    const periodEnd = new Date(trialEnd);
    if (billingCycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Utwórz nową subskrypcję
    const subscriptionData = {
      user_id: userId,
      plan_id: planId,
      billing_cycle: billingCycle,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      currency: 'PLN',
      payment_method: 'stripe',
      stripe_subscription_id: session.subscription as string,
      stripe_customer_id: session.customer as string,
      customer_data: session.customer_details ? {
        email: session.customer_details.email,
        name: session.customer_details.name,
      } : null,
      created_at: now.toISOString(),
    };

    const { error } = await supabase
      .from('user_subscriptions')
      .insert(subscriptionData);

    if (error) {
      console.error('❌ Błąd tworzenia subskrypcji:', error);
    } else {
      console.log('✅ Nowa subskrypcja utworzona pomyślnie');
    }

  } catch (error) {
    console.error('Błąd tworzenia/aktualizacji subskrypcji:', error);
    throw error;
  }
}

/**
 * Mapuj status Stripe na lokalny status
 */
function mapStripeStatusToLocal(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'failed';
    case 'trialing':
      return 'active'; // Trial traktujemy jako aktywną subskrypcję
    default:
      console.warn('⚠️ Nieznany status Stripe:', stripeStatus);
      return 'pending';
  }
}