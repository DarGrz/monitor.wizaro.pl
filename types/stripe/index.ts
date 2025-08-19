import Stripe from 'stripe';

// Type aliases zamiast pustych interfejsów
export type StripeCustomer = Stripe.Customer;
export type StripeSubscription = Stripe.Subscription;
export type StripeInvoice = Stripe.Invoice;
export type StripeCheckoutSession = Stripe.Checkout.Session;
export type StripePrice = Stripe.Price;
export type StripeProduct = Stripe.Product;
export type StripeBillingPortalSession = Stripe.BillingPortal.Session;
export type StripeWebhookEvent = Stripe.Event;

export type SubscriptionStatus = 
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

export type PaymentStatus = 
  | 'succeeded'
  | 'pending'
  | 'failed'
  | 'canceled';

export interface DatabaseSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  stripe_price_id?: string;
  stripe_checkout_session_id?: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end?: boolean;
  canceled_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    planId?: string;
    cycle?: string;
  };
}

export interface DatabaseBillingInfo {
  id: string;
  user_id?: string;
  stripe_invoice_id: string;
  stripe_customer_id: string;
  stripe_payment_intent_id?: string;
  amount_paid: number;
  currency: string;
  status: PaymentStatus;
  invoice_pdf_url?: string;
  failure_reason?: string;
  paid_at?: string;
  created_at: string;
}
