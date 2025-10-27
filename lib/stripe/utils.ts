// Funkcje pomocnicze dla Stripe - subskrypcje
// Adaptacja z payment_documentation.doc dostosowana do struktury Twojej aplikacji

import Stripe from 'stripe';
import { stripe, getPlanConfig, getProductDescription, STRIPE_CONFIG } from './config';
import type { PlanId, BillingCycle } from './config';

// Interfejsy zgodne z Twoją obecną strukturą danych
export interface StripeCustomerData {
  email: string;
  firstName?: string;
  companyName?: string;
  nip?: string;
  address?: {
    street: string;
    buildingNumber: string;
    apartmentNumber?: string;
    city: string;
    zipCode: string;
  };
}

export interface CreateSubscriptionRequest {
  planId: PlanId;
  billingCycle: BillingCycle;
  customerData: StripeCustomerData;
  userId: string;
  amount?: number; // Optional amount in grosz - if not provided, uses config
  metadata?: Record<string, string>;
}

export interface StripeSubscriptionResponse {
  sessionId: string;
  subscriptionId?: string;
  clientSecret?: string;
  url: string;
  customerId: string;
}

/**
 * Utwórz lub pobierz istniejącego klienta Stripe
 */
export async function createOrRetrieveStripeCustomer(
  customerData: StripeCustomerData,
  userId: string
): Promise<Stripe.Customer> {
  try {
    // Sprawdź czy klient już istnieje w Stripe
    const existingCustomers = await stripe.customers.list({
      email: customerData.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0];
      
      // Aktualizuj dane klienta jeśli się zmieniły
      const updatedCustomer = await stripe.customers.update(customer.id, {
        name: customerData.companyName || customerData.firstName,
        metadata: {
          user_id: userId,
          company_name: customerData.companyName || '',
          ...(customerData.nip && { nip: customerData.nip }),
          ...(customerData.nip && { vat_number: `PL${customerData.nip}` }),
          type: 'wizaro_subscription_client',
        },
        ...(customerData.address && {
          address: {
            line1: `${customerData.address.street} ${customerData.address.buildingNumber}${customerData.address.apartmentNumber ? `/${customerData.address.apartmentNumber}` : ''}`,
            city: customerData.address.city,
            postal_code: customerData.address.zipCode,
            country: 'PL',
          }
        }),
      });
      
      return updatedCustomer;
    }

    // Utwórz nowego klienta
    const customer = await stripe.customers.create({
      email: customerData.email,
      name: customerData.companyName || customerData.firstName,
      metadata: {
        user_id: userId,
        company_name: customerData.companyName || '',
        ...(customerData.nip && { nip: customerData.nip }),
        ...(customerData.nip && { vat_number: `PL${customerData.nip}` }),
        type: 'wizaro_subscription_client',
      },
      ...(customerData.address && {
        address: {
          line1: `${customerData.address.street} ${customerData.address.buildingNumber}${customerData.address.apartmentNumber ? `/${customerData.address.apartmentNumber}` : ''}`,
          city: customerData.address.city,
          postal_code: customerData.address.zipCode,
          country: 'PL',
        }
      }),
    });

    // Dodaj VAT ID jeśli podany NIP
    if (customerData.nip && customer.id) {
      try {
        await stripe.customers.createTaxId(customer.id, {
          type: 'eu_vat',
          value: `PL${customerData.nip}`,
        });
      } catch (taxError) {
        console.error('⚠️ Nie udało się dodać VAT ID:', taxError);
        // Nie przerywamy procesu - VAT ID nie jest krytyczny
      }
    }

    return customer;
  } catch (error) {
    console.error('Błąd podczas tworzenia/pobierania klienta Stripe:', error);
    throw new Error('Nie udało się utworzyć klienta w systemie płatności');
  }
}

/**
 * Utwórz subskrypcję Stripe z checkout session
 */
export async function createStripeSubscription(
  request: CreateSubscriptionRequest
): Promise<StripeSubscriptionResponse> {
  try {
    // Walidacja danych wejściowych
    if (!request.planId || !request.billingCycle || !request.customerData.email || !request.userId) {
      throw new Error('Brakuje wymaganych danych do utworzenia subskrypcji');
    }

    // Pobierz konfigurację planu lub użyj przekazanej kwoty
    const planConfig = getPlanConfig(request.planId, request.billingCycle);
    const amount = request.amount || planConfig.amount; // Użyj przekazanej kwoty lub z konfiguracji
    
    // Utwórz lub pobierz klienta
    const customer = await createOrRetrieveStripeCustomer(request.customerData, request.userId);

    // Przygotuj metadata dla subskrypcji
    const metadata = {
      user_id: request.userId,
      plan_id: request.planId,
      billing_cycle: request.billingCycle,
      company_name: request.customerData.companyName || '',
      ...(request.customerData.nip && { nip: request.customerData.nip }),
      type: 'wizaro_subscription',
      ...request.metadata,
    };

    // Utwórz Checkout Session dla subskrypcji używając price_data zamiast priceId
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'], // Tylko karty dla subskrypcji - BLIK i P24 nie obsługują płatności cyklicznych
      
      line_items: [
        {
          price_data: {
            currency: 'pln',
            product_data: {
              name: `Monitor Wizaro - ${getProductDescription(request.planId, request.billingCycle)}`,
              description: `Plan ${request.planId} z płatnością ${request.billingCycle === 'monthly' ? 'miesięczną' : 'roczną'}`,
            },
            unit_amount: amount,
            recurring: {
              interval: request.billingCycle === 'monthly' ? 'month' : 'year',
            },
          },
          quantity: 1,
          // Dodaj tax rate dla polskiego VAT jeśli podany NIP
          ...(request.customerData.nip && STRIPE_CONFIG.vatRate !== 'txr_1PLACEHOLDER' && {
            tax_rates: [STRIPE_CONFIG.vatRate]
          }),
        },
      ],

      // URL-e powrotne
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?canceled=true`,

      // Metadata
      metadata,
      
      // Konfiguracja dla polskich płatności
      locale: 'pl',
      currency: 'pln',
      
      // Pozwól na promocje i kupony
      allow_promotion_codes: true,
      
      // Informacje o subskrypcji
      subscription_data: {
        metadata,
        description: `${getProductDescription(request.planId, request.billingCycle)} - Monitor Wizaro`,
      },
    });

    if (!session.url) {
      throw new Error('Nie udało się utworzyć sesji płatności');
    }

    return {
      sessionId: session.id,
      url: session.url,
      customerId: customer.id,
    };

  } catch (error) {
    console.error('Błąd podczas tworzenia subskrypcji Stripe:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      // Błędy specyficzne dla Stripe
      throw new Error(`Błąd płatności: ${error.message}`);
    }
    
    throw error;
  }
}

/**
 * Pobierz szczegóły subskrypcji ze Stripe
 */
export async function getStripeSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['customer', 'latest_invoice', 'items.data.price'],
    });
    
    return subscription;
  } catch (error) {
    console.error('Błąd podczas pobierania subskrypcji:', error);
    return null;
  }
}

/**
 * Anuluj subskrypcję Stripe
 */
export async function cancelStripeSubscription(subscriptionId: string, immediately: boolean = false): Promise<Stripe.Subscription> {
  try {
    if (immediately) {
      // Natychmiastowe anulowanie
      return await stripe.subscriptions.cancel(subscriptionId);
    } else {
      // Anulowanie na koniec okresu rozliczeniowego
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  } catch (error) {
    console.error('Błąd podczas anulowania subskrypcji:', error);
    throw new Error('Nie udało się anulować subskrypcji');
  }
}

/**
 * Utwórz URL do portalu klienta Stripe
 */
export async function createCustomerPortalUrl(customerId: string): Promise<string> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`,
    });
    
    return session.url;
  } catch (error) {
    console.error('Błąd podczas tworzenia portalu klienta:', error);
    throw new Error('Nie udało się utworzyć portalu zarządzania płatnościami');
  }
}

/**
 * Pobierz szczegóły sesji checkout
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription', 'invoice'],
    });
    
    return session;
  } catch (error) {
    console.error('Błąd podczas pobierania sesji checkout:', error);
    return null;
  }
}

/**
 * Weryfikuj webhook signature Stripe
 */
export function constructWebhookEvent(body: string, signature: string): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(body, signature, STRIPE_CONFIG.webhookSecret);
  } catch (error) {
    console.error('Błąd weryfikacji webhook signature:', error);
    throw new Error('Nieprawidłowy podpis webhook');
  }
}

/**
 * Generuj unikalny ID dla external order (podobnie jak w PayU)
 */
export function generateExtOrderId(planId: string, userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `SUB-${planId.toUpperCase()}-${userId.slice(-8)}-${timestamp}-${random}`;
}