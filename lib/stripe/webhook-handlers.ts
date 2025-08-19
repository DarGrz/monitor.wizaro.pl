import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

// Dodajemy interfejs z właściwymi typami dla subskrypcji
interface StripeSubscriptionWithPeriods extends Stripe.Subscription {
  current_period_start: number;
  current_period_end: number;
}

export async function handleStripeWebhook(event: Stripe.Event) {
  console.log('Processing webhook event:', event.type);

  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as StripeSubscriptionWithPeriods);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as StripeSubscriptionWithPeriods);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as StripeSubscriptionWithPeriods);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.created':
      await handleCustomerCreated(event.data.object as Stripe.Customer);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleSubscriptionCreated(subscription: StripeSubscriptionWithPeriods) {
  const supabase = await createClient();
  
  console.log('Subscription created:', subscription.id);
  
  // Znajdź użytkownika na podstawie customer_id
  const { data: customer, error: customerError } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', subscription.customer as string)
    .single();

  if (customerError || !customer) {
    console.error('Customer not found for subscription:', subscription.customer);
    throw new Error(`Customer not found: ${subscription.customer}`);
  }
  
  // Aktualizuj dane subskrypcji w bazie danych
  const { error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: customer.user_id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error creating subscription in database:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: StripeSubscriptionWithPeriods) {
  const supabase = await createClient();
  
  console.log('Subscription updated:', subscription.id);
  
  // Aktualizuj istniejącą subskrypcję
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription in database:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: StripeSubscriptionWithPeriods) {
  const supabase = await createClient();
  
  console.log('Subscription deleted:', subscription.id);
  
  // Oznacz subskrypcję jako anulowaną
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error canceling subscription in database:', error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const supabase = await createClient();
  
  console.log('Invoice payment succeeded:', invoice.id);
  
  // Znajdź użytkownika na podstawie customer_id
  const { data: customer, error: customerError } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', invoice.customer as string)
    .single();

  if (customerError || !customer) {
    console.error('Customer not found for invoice:', invoice.customer);
    return;
  }
  
  // Zapisz informacje o płatności
  const { error } = await supabase
    .from('stripe_payments')
    .insert({
      user_id: customer.user_id,
      stripe_invoice_id: invoice.id,
      stripe_customer_id: invoice.customer as string,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      paid_at: new Date(invoice.status_transitions.paid_at! * 1000).toISOString(),
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error recording payment in database:', error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = await createClient();
  
  console.log('Invoice payment failed:', invoice.id);
  
  // Znajdź użytkownika na podstawie customer_id
  const { data: customer, error: customerError } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', invoice.customer as string)
    .single();

  if (customerError || !customer) {
    console.error('Customer not found for invoice:', invoice.customer);
    return;
  }
  
  // Zapisz informacje o nieudanej płatności
  const { error } = await supabase
    .from('stripe_payments')
    .insert({
      user_id: customer.user_id,
      stripe_invoice_id: invoice.id,
      stripe_customer_id: invoice.customer as string,
      amount_paid: 0,
      currency: invoice.currency,
      status: 'failed',
      failure_reason: 'Payment failed',
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error recording failed payment in database:', error);
    throw error;
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const supabase = await createClient();
  
  console.log('Checkout session completed:', session.id);
  
  if (session.mode === 'subscription') {
    // Powiąż użytkownika z subskrypcją
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', session.subscription as string);

    if (error) {
      console.error('Error linking checkout session to subscription:', error);
      throw error;
    }
  }
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  const supabase = await createClient();
  
  console.log('Customer created:', customer.id);
  
  // Znajdź użytkownika na podstawie email  
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }
  
  const authUser = users.users.find(u => u.email === customer.email);
  
  if (!authUser) {
    console.error('User not found for customer email:', customer.email);
    return;
  }

  // Znajdź odpowiadający rekord w tabeli users
  const { data: userRecord, error: userRecordError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single();

  if (userRecordError || !userRecord) {
    console.error('User record not found for auth user:', authUser.id);
    return;
  }
  
  // Zapisz mapowanie customer -> user
  const { error } = await supabase
    .from('stripe_customers')
    .insert({
      user_id: userRecord.id,
      stripe_customer_id: customer.id,
      email: customer.email!,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error creating customer mapping:', error);
    throw error;
  }
}
