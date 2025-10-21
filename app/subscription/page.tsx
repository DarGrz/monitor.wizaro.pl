'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

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

// Plany subskrypcji na sztywno
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'basic',
    display_name: 'Plan Podstawowy',
    description: 'Idealny dla małych firm rozpoczynających dbanie o swój wizerunek w internecie.',
    price_monthly_net: 649.59,
    price_monthly_gross: 799,
    price_yearly_net: 5680,
    price_yearly_gross: 6988,
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
  {
    id: 'professional',
    name: 'professional',
    display_name: 'Plan Profesjonalny',
    description: 'Dla firm które chcą kompleksowo dbać o swój wizerunek z dodatkowymi funkcjami.',
    price_monthly_net: 999,
    price_monthly_gross: 1299,
    price_yearly_net: 999,
    price_yearly_gross:  12290 ,
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
  {
    id: 'enterprise',
    name: 'enterprise',
    display_name: 'Plan Enterprise',
    description: 'Dla dużych firm wymagających zaawansowanego monitoringu i nieograniczonych możliwości.',
    price_monthly_net: 399,
    price_monthly_gross: 491,
    price_yearly_net: 3990,
    price_yearly_gross: 4908,
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
]

export default function SubscriptionPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card')
  const router = useRouter()
  const supabase = createClient()

  // Dostępne metody płatności PayU
  const paymentMethods = [
    { id: 'card', name: 'Karta płatnicza', icon: '💳', description: 'Visa, Mastercard, Maestro' },
    { id: 'blik', name: 'BLIK', icon: '📱', description: 'Płatność kodem z aplikacji banku' },
    { id: 'transfer', name: 'Przelew bankowy', icon: '🏦', description: 'Tradycyjny przelew' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️', description: 'Szybka płatność PayPal' },
  ]

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

  const handleSubscriptionSelect = async (plan: SubscriptionPlan) => {
    if (!user || paymentLoading) return
    
    setPaymentLoading(true)
    
    try {
      const price = billingCycle === 'monthly' ? plan.price_monthly_gross : plan.price_yearly_gross
      const planDuration = billingCycle === 'monthly' ? 'monthly' : 'yearly'
      
      // Wywołaj API PayU do utworzenia płatności
      const response = await fetch('/api/payu/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          billingCycle: planDuration,
          amount: Math.round(price * 100), // PayU oczekuje kwoty w groszach
          paymentMethod: selectedPaymentMethod, // Dodana metoda płatności
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
            email: user.email
          }
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Wystąpił błąd podczas tworzenia płatności')
      }

      // Przekieruj do PayU
      if (data.redirectUri) {
        window.location.href = data.redirectUri
      }
    } catch (error) {
      console.error('Błąd podczas tworzenia płatności PayU:', error)
      alert('Wystąpił błąd podczas tworzenia płatności. Spróbuj ponownie.')
    } finally {
      setPaymentLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie...</p>
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

          {/* Sekcja wyboru metody płatności */}
          <div className="max-w-4xl mx-auto mb-8">
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-4">
              Wybierz metodę płatności
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  className={`p-4 border-2 rounded-lg transition-all text-center ${
                    selectedPaymentMethod === method.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-2">{method.icon}</div>
                  <div className="font-medium text-sm">{method.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{method.description}</div>
                </button>
              ))}
            </div>
          </div>
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
                      {plan.price_monthly_gross.toFixed(0)} {plan.currency}
                    </div>
                    <div className="text-sm text-gray-600">
                      /miesiąc <span className="font-medium text-gray-800">(brutto)</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {plan.price_monthly_net.toFixed(0)} {plan.currency} netto + 23% VAT
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    <div className="text-3xl lg:text-4xl font-bold text-blue-600">
                      {plan.price_yearly_gross.toFixed(0)} {plan.currency}
                    </div>
                    <div className="text-sm text-gray-600">
                      /rok <span className="font-medium text-gray-800">(brutto)</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {plan.price_yearly_net.toFixed(0)} {plan.currency} netto + 23% VAT
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      = {(plan.price_yearly_gross / 12).toFixed(0)} {plan.currency}/miesiąc
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
                    ? `Wybierz za ${plan.price_yearly_gross.toFixed(0)} ${plan.currency}/rok`
                    : `Wybierz za ${plan.price_monthly_gross.toFixed(0)} ${plan.currency}/miesiąc`
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-gray-600 mb-2">
            Wszystkie plany zawierają 14-dniowy okres próbny bez zobowiązań
          </p>
          <p className="text-xs text-gray-500">
            * Ceny podane brutto (zawierają 23% VAT)
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
