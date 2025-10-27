// Hook dla subskrypcji Stripe - zastępuje usePayU
// Zachowuje kompatybilną strukturę z obecną aplikacją

'use client';

import { useState, useCallback } from 'react';

// Interfejsy kompatybilne z obecną strukturą
interface StripeSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_start?: string;
  trial_end?: string;
  amount_gross?: number;
  currency: string;
  payment_method: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
}

interface UseStripeReturn {
  loading: boolean;
  error: string | null;
  subscription: StripeSubscription | null;
  createPayment: (planId: string, billingCycle: 'monthly' | 'yearly') => Promise<void>;
  getSubscription: () => Promise<StripeSubscription | null>;
  hasActiveSubscription: () => boolean;
  createCustomerPortal: () => Promise<string | null>;
}

import { PLAN_PRICING } from '@/lib/pricing/plans';

// Ceny planów (w groszach) - importowane z centralnej konfiguracji
const PLAN_PRICES = {
  basic: { 
    monthly: PLAN_PRICING.basic.monthly.grosz, 
    yearly: PLAN_PRICING.basic.yearly.grosz 
  },
  professional: { 
    monthly: PLAN_PRICING.professional.monthly.grosz, 
    yearly: PLAN_PRICING.professional.yearly.grosz 
  },
  enterprise: { 
    monthly: PLAN_PRICING.enterprise.monthly.grosz, 
    yearly: PLAN_PRICING.enterprise.yearly.grosz 
  }
} as const;

export function useStripe(): UseStripeReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<StripeSubscription | null>(null);

  const createPayment = useCallback(async (
    planId: string,
    billingCycle: 'monthly' | 'yearly'
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Pobierz kwotę dla planu
      const amount = PLAN_PRICES[planId as keyof typeof PLAN_PRICES]?.[billingCycle];
      
      if (!amount) {
        throw new Error('Nieprawidłowy plan lub okres płatności');
      }

      // Wywołaj API Stripe dla subskrypcji
      const response = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingCycle,
          amount,
          customerData: {
            email: '', // Zostanie uzupełnione przez API na podstawie użytkownika
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Wystąpił błąd podczas tworzenia płatności');
      }

      // Przekieruj do Stripe Checkout
      if (data.redirectUri) {
        window.location.href = data.redirectUri;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd';
      setError(errorMessage);
      console.error('Błąd podczas tworzenia płatności Stripe:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getSubscription = useCallback(async (): Promise<StripeSubscription | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/subscription');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Wystąpił błąd podczas pobierania subskrypcji');
      }

      setSubscription(data.subscription);
      return data.subscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd';
      setError(errorMessage);
      console.error('Błąd podczas pobierania subskrypcji:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCustomerPortal = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Wystąpił błąd podczas tworzenia portalu zarządzania');
      }

      return data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd';
      setError(errorMessage);
      console.error('Błąd podczas tworzenia portalu zarządzania:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const hasActiveSubscription = useCallback((): boolean => {
    if (!subscription) return false;
    
    const activeStatuses = ['active'];
    return activeStatuses.includes(subscription.status);
  }, [subscription]);

  return {
    loading,
    error,
    subscription,
    createPayment,
    getSubscription,
    hasActiveSubscription,
    createCustomerPortal,
  };
}

// Export dla kompatybilności z obecnym kodem
export { useStripe as usePayU };