import { stripe } from './config';
import Stripe from 'stripe';

export interface CreateCheckoutSessionParams {
  priceId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CreateCustomerParams {
  email: string;
  name?: string;
  userId?: string;
  metadata?: Record<string, string>;
}

export async function createCheckoutSession({
  priceId,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
  metadata = {},
}: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card', 'blik', 'p24'],
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        ...metadata,
      },
      subscription_data: {
        metadata: {
          userId,
          ...metadata,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      locale: 'pl',
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function createCustomer({
  email,
  name,
  metadata = {},
}: CreateCustomerParams): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    // Zapisz mapowanie w bazie danych (jeśli user_id jest w metadata)
    if (metadata.userId) {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      
      // Znajdź user_id w tabeli users na podstawie auth_id
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', metadata.userId)
        .single();

      if (!userError && userRecord) {
        await supabase
          .from('stripe_customers')
          .insert({
            user_id: userRecord.id,
            stripe_customer_id: customer.id,
            email: customer.email!,
          });
      }
    }

    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

export async function getCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
  try {
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    return customers.data.length > 0 ? customers.data[0] : null;
  } catch (error) {
    console.error('Error getting customer by email:', error);
    throw error;
  }
}

export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Error getting subscription:', error);
    throw error;
  }
}

export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.cancel(subscriptionId);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

export async function updateSubscription(
  subscriptionId: string,
  params: Stripe.SubscriptionUpdateParams
): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.update(subscriptionId, params);
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  try {
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
}

export async function getInvoices(customerId: string): Promise<Stripe.Invoice[]> {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
    });

    return invoices.data;
  } catch (error) {
    console.error('Error getting invoices:', error);
    throw error;
  }
}

export async function getUserPaymentHistory(userId: string) {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data: payments, error } = await supabase
      .from('stripe_payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return payments;
  } catch (error) {
    console.error('Error getting user payment history:', error);
    throw error;
  }
}
