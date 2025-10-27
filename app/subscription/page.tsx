'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { useSubscriptionPlans, type SubscriptionPlan } from '@/hooks/useSubscriptionPlans'

interface CompanyData {
  id: string
  user_id: string
  company_name: string
  nip: string
  regon?: string
  krs?: string
  street: string
  building_number: string
  apartment_number?: string
  city: string
  zip_code: string
  created_at: string
  updated_at: string
}



export default function SubscriptionPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  // Pobierz plany z bazy danych
  const { plans: SUBSCRIPTION_PLANS, loading: plansLoading, error: plansError } = useSubscriptionPlans()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Sprawdź czy profil jest uzupełniony
      if (!user.user_metadata?.profile_completed) {
        router.push('/complete-profile')
        return
      }

      setUser(user)
      
      // Pobierz dane firmy użytkownika
      const { data: company } = await supabase
        .from('user_companies')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      setCompanyData(company)
      setLoading(false)
    }

    getUser()
  }, [router, supabase])

  // Dodaj obsługę błędu planów
  useEffect(() => {
    if (plansError) {
      console.error('Błąd ładowania planów:', plansError)
    }
  }, [plansError])

  const handleSubscriptionSelect = async (plan: SubscriptionPlan) => {
    if (!user || paymentLoading) return
    
    setPaymentLoading(true)
    
    try {
      const price = billingCycle === 'monthly' ? plan.price_monthly_gross : plan.price_yearly_gross
      const planDuration = billingCycle === 'monthly' ? 'monthly' : 'yearly'
      
      // Wywołaj API Stripe do utworzenia płatności rekurencyjnej
      const response = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          billingCycle: planDuration,
          amount: price, // API route sam dokona konwersji na grosze
          customerData: companyData ? {
            email: user.email,
            firstName: companyData.company_name,
            companyName: companyData.company_name,
            nip: companyData.nip,
            address: {
              street: companyData.street,
              buildingNumber: companyData.building_number,
              apartmentNumber: companyData.apartment_number,
              city: companyData.city,
              zipCode: companyData.zip_code
            }
          } : {
            email: user.email,
            firstName: user.user_metadata?.name || 'Klient'
          }
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Wystąpił błąd podczas tworzenia subskrypcji')
      }

      // Przekieruj do Stripe Checkout
      if (data.redirectUri) {
        window.location.href = data.redirectUri
      }
    } catch (error) {
      console.error('Błąd podczas tworzenia subskrypcji Stripe:', error)
      alert('Wystąpił błąd podczas tworzenia subskrypcji. Spróbuj ponownie.')
    } finally {
      setPaymentLoading(false)
    }
  }

  if (loading || plansLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie...</p>
        </div>
      </div>
    )
  }

  // Jeśli nie udało się załadować planów
  if (plansError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-600">Błąd ładowania planów subskrypcji</p>
          <p className="text-sm text-gray-500 mt-2">{plansError}</p>
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
          {SUBSCRIPTION_PLANS.map((plan) => (
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
                    <div className="text-xs text-gray-500 mt-1">
                      {plan.price_monthly_gross.toFixed(0)} {plan.currency} brutto (z 23% VAT)
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
                    <div className="text-xs text-gray-500 mt-1">
                      {plan.price_yearly_gross.toFixed(0)} {plan.currency} brutto (z 23% VAT)
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      = {(plan.price_yearly_net / 12).toFixed(0)} {plan.currency}/miesiąc netto
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
                onClick={() => handleSubscriptionSelect(plan)}
                disabled={paymentLoading}
                className={`w-full py-3 px-4 rounded-lg font-medium mt-auto transition-colors ${
                  paymentLoading 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {paymentLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Przekierowywanie...
                  </div>
                ) : (
                  billingCycle === 'yearly' 
                    ? `Wybierz za ${plan.price_yearly_net} ${plan.currency}/rok netto`
                    : `Wybierz za ${plan.price_monthly_net} ${plan.currency}/miesiąc netto`
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-xs text-gray-500">
            * Ceny podane netto + 23% VAT (brutto w małym druku)
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
