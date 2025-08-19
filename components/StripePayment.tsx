'use client';

import { useState } from 'react';
import { useStripe } from '@/hooks/useStripe';
import { DatabaseSubscription } from '@/types/stripe';

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly_net: number;
  price_monthly_gross: number;
  price_yearly_net: number;
  price_yearly_gross: number;
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
  popular?: boolean;
}

interface StripePaymentProps {
  plans: SubscriptionPlan[];
  currentSubscription?: DatabaseSubscription | null;
}

export function StripePayment({ plans, currentSubscription }: StripePaymentProps) {
  const { loading, error, createCheckoutSession, createPortalSession } = useStripe();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleSubscribe = async (planId: string) => {
    setSelectedPlan(planId);
    try {
      await createCheckoutSession(
        planId,
        billingCycle,
        `${window.location.origin}/dashboard?success=true`,
        `${window.location.origin}/subscription?canceled=true`
      );
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setSelectedPlan(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      await createPortalSession(`${window.location.origin}/dashboard`);
    } catch (error) {
      console.error('Error creating portal session:', error);
    }
  };

  // Funkcja do pobierania ceny dla aktualnego cyklu
  const getPriceForCycle = (plan: SubscriptionPlan, cycle: 'monthly' | 'yearly') => {
    return cycle === 'yearly' ? plan.price_yearly_gross : plan.price_monthly_gross;
  };

  const getIntervalText = (cycle: 'monthly' | 'yearly') => {
    return cycle === 'yearly' ? 'rok' : 'miesiąc';
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price);
  };

  const isCurrentPlan = (planId: string) => {
    // Sprawdź czy to aktualny plan na podstawie plan_id z metadanych
    return currentSubscription?.metadata?.planId === planId;
  };

  // Generuj features na podstawie danych planu
  const getFeatures = (plan: SubscriptionPlan): string[] => {
    const features: string[] = [];
    
    if (plan.max_companies > 0) {
      features.push(`Do ${plan.max_companies} firm`);
    }
    
    if (plan.max_opinion_removals_monthly > 0) {
      features.push(`${plan.max_opinion_removals_monthly} usunięć opinii miesięcznie`);
    }
    
    if (plan.has_negative_monitoring) {
      features.push('Monitoring negatywnych opinii');
    }
    
    if (plan.has_weekly_reports) {
      features.push('Cotygodniowe raporty');
    }
    
    if (plan.has_email_notifications) {
      features.push('Powiadomienia email');
    }
    
    if (plan.has_instant_notifications) {
      features.push('Powiadomienia natychmiastowe');
    }
    
    if (plan.additional_services_discount_percent > 0) {
      features.push(`${plan.additional_services_discount_percent}% zniżki na usługi dodatkowe`);
    }
    
    return features;
  };

  const isActive = currentSubscription?.status === 'active';

  return (
    <div className="space-y-8">
      {/* Current Subscription Status */}
      {currentSubscription && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Aktualna subskrypcja
          </h3>
          <div className="text-blue-800">
            <p>Status: <span className="font-medium">{currentSubscription.status}</span></p>
            <p>
              Okres: {new Date(currentSubscription.current_period_start).toLocaleDateString('pl-PL')} - {' '}
              {new Date(currentSubscription.current_period_end).toLocaleDateString('pl-PL')}
            </p>
            {currentSubscription.cancel_at_period_end && (
              <p className="text-orange-600 font-medium mt-2">
                Subskrypcja zostanie anulowana na koniec okresu rozliczeniowego
              </p>
            )}
          </div>
          <button
            onClick={handleManageBilling}
            disabled={loading}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Ładowanie...' : 'Zarządzaj płatnościami'}
          </button>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Miesięcznie
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Rocznie
            <span className="ml-1 text-green-600 text-sm">(oszczędź 20%)</span>
          </button>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative border rounded-lg p-6 ${
              plan.popular
                ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                : 'border-gray-200'
            } ${isCurrentPlan(plan.id) ? 'bg-green-50 border-green-500' : 'bg-white'}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Popularne
                </span>
              </div>
            )}

            {isCurrentPlan(plan.id) && (
              <div className="absolute -top-3 right-4">
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Aktualny plan
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {plan.display_name}
              </h3>
              <div className="text-3xl font-bold text-gray-900">
                {formatPrice(getPriceForCycle(plan, billingCycle), plan.currency)}
                <span className="text-lg font-normal text-gray-500">
                  /{getIntervalText(billingCycle)}
                </span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {getFeatures(plan).map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={
                loading ||
                isCurrentPlan(plan.id) ||
                selectedPlan === plan.id
              }
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                isCurrentPlan(plan.id)
                  ? 'bg-green-100 text-green-800 cursor-not-allowed'
                  : plan.popular
                  ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {selectedPlan === plan.id
                ? 'Przekierowywanie...'
                : isCurrentPlan(plan.id)
                ? 'Aktualny plan'
                : 'Wybierz plan'}
            </button>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Info for existing subscription */}
      {isActive && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-gray-700 text-sm">
            Aby zmienić plan lub anulować subskrypcję, użyj przycisku &quot;Zarządzaj płatnościami&quot; powyżej.
          </p>
        </div>
      )}
    </div>
  );
}
