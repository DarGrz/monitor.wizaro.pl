// Konfiguracja Stripe dla płatności rekurencyjnych
// Bazuje na dokumentacji z payment_documentation.doc ale dostosowane do subskrypcji

import Stripe from 'stripe';

// Podstawowa konfiguracja Stripe
export const STRIPE_CONFIG = {
  apiVersion: '2025-09-30.clover' as const, // Najnowsza wersja API
  secretKey: process.env.STRIPE_SECRET_KEY!,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  vatRate: process.env.STRIPE_VAT_RATE_ID || 'txr_1PLACEHOLDER', // ID dla polskiego VAT 23%
};

// URL-e powrotne dla Stripe
export const STRIPE_RETURN_URLS = {
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?canceled=true`,
  customerPortalReturnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`,
};

// Instancja Stripe
export const stripe = new Stripe(STRIPE_CONFIG.secretKey, {
  apiVersion: STRIPE_CONFIG.apiVersion,
});

import { PLAN_PRICING } from '@/lib/pricing/plans';

// Mapowanie planów subskrypcji z centralnej konfiguracji cen na Stripe Price IDs
// Te ID będą utworzone w Stripe Dashboard lub przez API
export const SUBSCRIPTION_PLANS = {
  basic: {
    monthly: {
      priceId: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || 'price_basic_monthly_placeholder',
      amount: PLAN_PRICING.basic.monthly.grosz,
    },
    yearly: {
      priceId: process.env.STRIPE_BASIC_YEARLY_PRICE_ID || 'price_basic_yearly_placeholder', 
      amount: PLAN_PRICING.basic.yearly.grosz,
    },
  },
  professional: {
    monthly: {
      priceId: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID || 'price_professional_monthly_placeholder',
      amount: PLAN_PRICING.professional.monthly.grosz,
    },
    yearly: {
      priceId: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID || 'price_professional_yearly_placeholder',
      amount: PLAN_PRICING.professional.yearly.grosz,
    },
  },
  enterprise: {
    monthly: {
      priceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly_placeholder',
      amount: PLAN_PRICING.enterprise.monthly.grosz,
    },
    yearly: {
      priceId: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly_placeholder',
      amount: PLAN_PRICING.enterprise.yearly.grosz,
    },
  },
} as const;

// Typy dla lepszej typu bezpieczności
export type PlanId = keyof typeof SUBSCRIPTION_PLANS;
export type BillingCycle = 'monthly' | 'yearly';

// Funkcja pomocnicza do pobierania konfiguracji planu
export function getPlanConfig(planId: PlanId, billingCycle: BillingCycle) {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) {
    throw new Error(`Nieznany plan: ${planId}. Dostępne plany: ${Object.keys(SUBSCRIPTION_PLANS).join(', ')}`);
  }
  
  const cycle = plan[billingCycle];
  if (!cycle) {
    throw new Error(`Nieznany okres rozliczeniowy: ${billingCycle} dla planu: ${planId}. Dostępne: monthly, yearly`);
  }
  
  return cycle;
}

// Funkcja do pobierania opisu produktu - zgodna z Twoim obecnym systemem
export function getProductDescription(planId: PlanId, billingCycle: BillingCycle): string {
  const planNames = {
    basic: 'Plan Basic',
    professional: 'Plan Professional', 
    enterprise: 'Plan Enterprise',
  };
  
  const cycleNames = {
    monthly: 'miesięczny',  
    yearly: 'roczny',
  };
  
  return `${planNames[planId]} - ${cycleNames[billingCycle]}`;
}

// Walidacja konfiguracji Stripe
export function validateStripeConfig() {
  const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY', 
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_APP_URL',
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// Export default instance dla wygody
export default stripe;