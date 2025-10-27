// Konfiguracja Stripe dla płatności rekurencyjnych
// Pobiera dane planów z bazy danych Supabase

import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

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

// Interface dla planu z bazy danych
interface DatabasePlan {
  id: string;
  name: string;
  display_name: string;
  price_monthly_gross: number; // w groszach
  price_yearly_gross: number;  // w groszach
  is_active: boolean;
}

// Cache planów (odświeżany co 5 minut)
let plansCache: Record<string, DatabasePlan> | null = null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minut

// Pobierz plany z bazy danych z cache
export async function getSubscriptionPlansFromDB(): Promise<Record<string, DatabasePlan>> {
  const now = Date.now();
  
  // Jeśli cache jest świeży, użyj go
  if (plansCache && now < cacheExpiry) {
    return plansCache;
  }

  try {
    const supabase = await createClient();
    
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('id, name, display_name, price_monthly_gross, price_yearly_gross, is_active')
      .eq('is_active', true);

    if (error) {
      console.error('Błąd pobierania planów z bazy:', error);
      // Jeśli mamy stary cache, użyj go
      if (plansCache) {
        return plansCache;
      }
      throw error;
    }

    // Konwertuj array na object indexed by plan id
    const plansObject: Record<string, DatabasePlan> = {};
    plans.forEach(plan => {
      plansObject[plan.id] = plan;
    });

    // Zaktualizuj cache
    plansCache = plansObject;
    cacheExpiry = now + CACHE_DURATION;

    return plansObject;
  } catch (error) {
    console.error('Krytyczny błąd pobierania planów:', error);
    // Fallback do pustego obiektu jeśli nie ma cache
    return plansCache || {};
  }
}

// Pobierz szczegóły pojedynczego planu
export async function getPlanFromDB(planId: string): Promise<DatabasePlan | null> {
  const plans = await getSubscriptionPlansFromDB();
  return plans[planId] || null;
}

// Typ dla ID planów
export type PlanId = 'basic' | 'professional' | 'enterprise';

// Walidacja konfiguracji Stripe
export function validateStripeConfig() {
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY', 
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_APP_URL'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Brakuje zmiennych środowiskowych Stripe: ${missing.join(', ')}`);
  }

  if (!STRIPE_CONFIG.secretKey.startsWith('sk_')) {
    throw new Error('STRIPE_SECRET_KEY musi zaczynać się od "sk_"');
  }

  if (!STRIPE_CONFIG.publishableKey.startsWith('pk_')) {
    throw new Error('STRIPE_PUBLISHABLE_KEY musi zaczynać się od "pk_"');
  }
}