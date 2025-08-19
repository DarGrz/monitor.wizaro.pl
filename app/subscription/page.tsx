'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

interface SubscriptionPlan {
  id: string
  name: string
  display_name: string
  description: string
  price_monthly_net: number
  price_monthly_gross: number
  price_yearly_net: number
  price_yearly_gross: number
  currency: string
  max_companies: number
  max_opinion_removals_monthly: number
  has_negative_monitoring: boolean
  has_weekly_reports: boolean
  has_email_notifications: boolean
  has_instant_notifications: boolean
  additional_services_discount_percent: number
  estimated_monthly_savings: number
  is_active: boolean
}

export default function SubscriptionPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)
      setLoading(false)

      // Sprawdź czy użytkownik już ma aktywną subskrypcję
      // const { data: subscription } = await supabase
      //   .from('user_subscriptions')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .eq('status', 'active')
      //   .single()

      // if (subscription) {
      //   router.push('/complete-profile')
      // }
    }

    const getPlans = async () => {
      // Pobieraj plany tylko jeśli użytkownik jest zalogowany
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setPlansLoading(false)
        return
      }

      try {
        const response = await fetch('/api/subscription-plans')
        const data = await response.json()
        
        if (response.ok) {
          setPlans(data.plans || [])
        } else {
          console.error('Error fetching plans:', data.error)
        }
      } catch (error) {
        console.error('Error fetching plans:', error)
      } finally {
        setPlansLoading(false)
      }
    }

    getUser()
    getPlans()
  }, [router, supabase])

  const handleSubscriptionSelect = async (planId: string, cycle: 'monthly' | 'yearly' = billingCycle) => {
    if (!user) return

    try {
      setLoading(true)
      
      // Znajdź wybrany plan
      const selectedPlan = plans.find(plan => plan.id === planId)
      if (!selectedPlan) {
        alert('Nie znaleziono planu subskrypcji')
        return
      }

      const isYearly = cycle === 'yearly'
      const expiresAt = isYearly 
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 365 dni
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dni
      
      const periodEnd = isYearly
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: selectedPlan.id,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expiresAt,
          billing_cycle: cycle,
          amount_paid_net: isYearly ? selectedPlan.price_yearly_net : selectedPlan.price_monthly_net,
          amount_paid_gross: isYearly ? selectedPlan.price_yearly_gross : selectedPlan.price_monthly_gross,
          currency: selectedPlan.currency,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd
        })

      if (subscriptionError) {
        console.error('Błąd tworzenia subskrypcji:', subscriptionError)
        alert('Błąd podczas tworzenia subskrypcji')
        return
      }

      // Przekieruj do complete-profile
      router.push('/complete-profile')
    } catch (error) {
      console.error('Błąd:', error)
      alert('Wystąpił błąd podczas wyboru planu')
    } finally {
      setLoading(false)
    }
  }

  if (loading || plansLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie planów subskrypcji...</p>
        </div>
      </div>
    )
  }

  // Jeśli użytkownik nie jest zalogowany, nie wyświetlaj nic (przekierowanie już się dzieje)
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Przekierowywanie do logowania...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Wybierz plan subskrypcji
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
            Wybierz plan, który najlepiej odpowiada Twoim potrzebom ochrony wizerunku
          </p>
          
          {/* Przełącznik okresu płatności */}
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gray-100 p-1 rounded-lg flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-[#081D44] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Miesięcznie
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-[#081D44] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Rocznie
                <span className="ml-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  taniej
                </span>
              </button>
            </div>
          </div>
          
          {billingCycle === 'yearly' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <div className="text-sm text-blue-800">
                <strong>Płatność roczna:</strong> Płacisz za cały rok z góry i oszczędzasz na każdym planie
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`bg-white rounded-lg shadow-lg p-6 border-2 relative flex flex-col min-h-[500px] ${
                plan.name === 'professional' 
                  ? 'border-blue-500 transform lg:scale-105' 
                  : 'border-gray-200'
              }`}
            >
              {plan.name === 'professional' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Polecany
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3">{plan.display_name}</h2>
                
                {billingCycle === 'monthly' ? (
                  <div className="mb-3">
                    <div className="text-3xl lg:text-4xl font-bold text-blue-600">
                      {plan.price_monthly_net.toFixed(0)} {plan.currency}
                    </div>
                    <div className="text-sm text-gray-600">
                      /miesiąc <span className="font-medium text-gray-800">(netto)</span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    <div className="text-3xl lg:text-4xl font-bold text-blue-600">
                      {plan.price_yearly_net.toFixed(0)} {plan.currency}
                    </div>
                    <div className="text-sm text-gray-600">
                      /rok <span className="font-medium text-gray-800">(netto)</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      = {(plan.price_yearly_net / 12).toFixed(0)} {plan.currency}/miesiąc
                    </div>
                  </div>
                )}
                
                {billingCycle === 'yearly' && plan.estimated_monthly_savings > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                    <div className="text-sm text-green-700 font-medium">
                      💰 Oszczędzasz {plan.estimated_monthly_savings} {plan.currency}/miesiąc
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      w porównaniu z płatnością miesięczną
                    </div>
                  </div>
                )}
                
                <p className="text-gray-600 text-sm leading-relaxed px-2">{plan.description}</p>
              </div>
              
              <ul className="space-y-3 mb-6 flex-grow">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700 leading-relaxed">
                    {plan.max_companies === 1 
                      ? 'Monitoring 1 firmy' 
                      : plan.max_companies === 999 || plan.max_companies > 10
                      ? 'Monitoring nielimitowany'
                      : `Monitoring ${plan.max_companies} firm`
                    }
                  </span>
                </li>
                {plan.max_opinion_removals_monthly > 0 && (
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700 leading-relaxed">
                      {plan.max_opinion_removals_monthly} darmowych usunięć opinii/miesiąc
                    </span>
                  </li>
                )}
                {plan.has_weekly_reports && (
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700 leading-relaxed">
                      Cotygodniowe raporty
                    </span>
                  </li>
                )}
                {plan.has_email_notifications && (
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700 leading-relaxed">
                      Powiadomienia e-mail
                    </span>
                  </li>
                )}
                {plan.has_instant_notifications && (
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700 leading-relaxed">
                      Natychmiastowe powiadomienia
                    </span>
                  </li>
                )}
                {plan.additional_services_discount_percent > 0 && (
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700 leading-relaxed">
                      {plan.additional_services_discount_percent}% zniżki na dodatkowe usługi
                    </span>
                  </li>
                )}
              </ul>
              
              <button 
                onClick={() => handleSubscriptionSelect(plan.id, billingCycle)}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium mt-auto"
                disabled={loading}
              >
                {loading ? 'Przetwarzanie...' : 
                  billingCycle === 'yearly' 
                    ? `Wybierz za ${plan.price_yearly_net.toFixed(0)} ${plan.currency}/rok`
                    : `Wybierz za ${plan.price_monthly_net.toFixed(0)} ${plan.currency}/miesiąc`
                }
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-gray-600 mb-2">
            Wszystkie plany zawierają 14-dniowy okres próbny bez zobowiązań
          </p>
          <p className="text-xs text-gray-500">
            * Ceny podane netto, do kwoty należy doliczyć VAT
          </p>
          {billingCycle === 'yearly' && (
            <p className="text-sm text-green-600 font-medium mt-2">
              💡 Płatność roczna pozwala zaoszczędzić do 20% w porównaniu z płatnością miesięczną
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
