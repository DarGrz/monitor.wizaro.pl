'use client';

import { useState, useCallback } from 'react';
import { DatabaseSubscription } from '@/types/stripe';

interface UseStripeReturn {
  loading: boolean;
  error: string | null;
  createCheckoutSession: (planId: string, cycle?: 'monthly' | 'yearly', successUrl?: string, cancelUrl?: string) => Promise<void>;
  createPortalSession: (returnUrl?: string) => Promise<void>;
  getSubscription: () => Promise<DatabaseSubscription | null>;
}

export function useStripe(): UseStripeReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckoutSession = useCallback(async (
    planId: string,
    cycle: 'monthly' | 'yearly' = 'monthly',
    successUrl?: string,
    cancelUrl?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          cycle,
          successUrl,
          cancelUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Przekieruj do Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPortalSession = useCallback(async (returnUrl?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      // Przekieruj do Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSubscription = useCallback(async (): Promise<DatabaseSubscription | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/subscription');

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get subscription');
      }

      return data.subscription;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createCheckoutSession,
    createPortalSession,
    getSubscription,
  };
}
