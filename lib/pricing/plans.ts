// Centralna konfiguracja cen planów subskrypcji
// Używana przez wszystkie komponenty aplikacji

export interface PlanPricing {
  monthly: {
    net: number;    // cena netto w PLN
    gross: number;  // cena brutto w PLN
    grosz: number;  // cena brutto w groszach (dla Stripe)
  };
  yearly: {
    net: number;    // cena netto w PLN
    gross: number;  // cena brutto w PLN  
    grosz: number;  // cena brutto w groszach (dla Stripe)
  };
}

export interface PlanDetails {
  id: string;
  name: string;
  display_name: string;
  description: string;
  pricing: PlanPricing;
  currency: string;
  max_companies: number;
  max_opinion_removals_monthly: number;
  has_negative_monitoring: boolean;
  has_weekly_reports: boolean;
  has_email_notifications: boolean;
  has_instant_notifications: boolean;
  additional_services_discount_percent: number;
  estimated_monthly_savings: number;
  is_active: boolean;
}

// Centralna definicja cen - pojedyncze źródło prawdy
export const PLAN_PRICING: Record<string, PlanPricing> = {
  basic: {
    monthly: {
      net: 649.59,
      gross: 799,
      grosz: 79900
    },
    yearly: {
      net: 5680,
      gross: 6988,
      grosz: 698800
    }
  },
  professional: {
    monthly: {
      net: 999,
      gross: 1299,
      grosz: 129900
    },
    yearly: {
      net: 999,
      gross: 12290,
      grosz: 1229000
    }
  },
  enterprise: {
    monthly: {
      net: 399,
      gross: 491,
      grosz: 49100
    },
    yearly: {
      net: 3990,
      gross: 4908,
      grosz: 490800
    }
  }
} as const;

// Szczegółowe informacje o planach
export const PLAN_DETAILS: Record<string, PlanDetails> = {
  basic: {
    id: 'basic',
    name: 'basic',
    display_name: 'Plan Podstawowy',
    description: 'Idealny dla małych firm rozpoczynających dbanie o swój wizerunek w internecie.',
    pricing: PLAN_PRICING.basic,
    currency: 'PLN',
    max_companies: 1,
    max_opinion_removals_monthly: 2,
    has_negative_monitoring: true,
    has_weekly_reports: false,
    has_email_notifications: true,
    has_instant_notifications: false,
    additional_services_discount_percent: 0,
    estimated_monthly_savings: 18,
    is_active: true
  },
  professional: {
    id: 'professional',
    name: 'professional',
    display_name: 'Plan Profesjonalny',
    description: 'Dla firm które chcą kompleksowo dbać o swój wizerunek z dodatkowymi funkcjami.',
    pricing: PLAN_PRICING.professional,
    currency: 'PLN',
    max_companies: 3,
    max_opinion_removals_monthly: 5,
    has_negative_monitoring: true,
    has_weekly_reports: true,
    has_email_notifications: true,
    has_instant_notifications: true,
    additional_services_discount_percent: 10,
    estimated_monthly_savings: 40,
    is_active: true
  },
  enterprise: {
    id: 'enterprise',
    name: 'enterprise',
    display_name: 'Plan Enterprise',
    description: 'Dla dużych firm wymagających zaawansowanego monitoringu i nieograniczonych możliwości.',
    pricing: PLAN_PRICING.enterprise,
    currency: 'PLN',
    max_companies: 999,
    max_opinion_removals_monthly: 15,
    has_negative_monitoring: true,
    has_weekly_reports: true,
    has_email_notifications: true,
    has_instant_notifications: true,
    additional_services_discount_percent: 20,
    estimated_monthly_savings: 80,
    is_active: true
  }
} as const;

// Funkcje pomocnicze
export function getPlanPricing(planId: string): PlanPricing {
  const pricing = PLAN_PRICING[planId];
  if (!pricing) {
    throw new Error(`Nieznany plan: ${planId}. Dostępne plany: ${Object.keys(PLAN_PRICING).join(', ')}`);
  }
  return pricing;
}

export function getPlanDetails(planId: string): PlanDetails {
  const details = PLAN_DETAILS[planId];
  if (!details) {
    throw new Error(`Nieznany plan: ${planId}. Dostępne plany: ${Object.keys(PLAN_DETAILS).join(', ')}`);
  }
  return details;
}

// Export typu dla kompatybilności z obecnym kodem
export type SubscriptionPlan = PlanDetails & {
  price_monthly_net: number;
  price_monthly_gross: number;
  price_yearly_net: number;
  price_yearly_gross: number;
};

// Konwersja do formatu używanego przez obecny kod
export function getSubscriptionPlans(): SubscriptionPlan[] {
  return Object.values(PLAN_DETAILS).map(plan => ({
    ...plan,
    price_monthly_net: plan.pricing.monthly.net,
    price_monthly_gross: plan.pricing.monthly.gross,
    price_yearly_net: plan.pricing.yearly.net,
    price_yearly_gross: plan.pricing.yearly.gross,
  }));
}