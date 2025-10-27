import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SubscriptionPlan {
  id: string
  name: string
  display_name: string
  description: string
  
  // Pricing (konwertowane z groszy na PLN dla UI)
  price_monthly_net: number
  price_monthly_gross: number
  price_yearly_net: number
  price_yearly_gross: number
  currency: string
  
  // Features
  max_companies: number
  max_opinion_removals_monthly: number
  has_negative_monitoring: boolean
  has_weekly_reports: boolean
  has_email_notifications: boolean
  has_instant_notifications: boolean
  additional_services_discount_percent: number
  
  // Calculated fields
  estimated_monthly_savings: number
  
  // Status
  is_active: boolean
  display_order: number
}

export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })

        if (error) {
          throw error
        }

        // Konwertuj ceny z groszy na PLN i dodaj obliczone pola
        const convertedPlans: SubscriptionPlan[] = data.map(plan => {
          const monthlyGross = plan.price_monthly_gross
          const yearlyGross = plan.price_yearly_gross
          const monthlyFromYearly = yearlyGross / 12
          const savings = monthlyGross - monthlyFromYearly

          return {
            ...plan,
            // Konwertuj z groszy na PLN
            price_monthly_net: Number((plan.price_monthly_net)),
            price_monthly_gross: Number(monthlyGross),
            price_yearly_net: Number((plan.price_yearly_net)),
            price_yearly_gross: Number(yearlyGross),
            // Oblicz oszczędności miesięczne przy płatności rocznej
            estimated_monthly_savings: Math.round(Math.max(0, savings))
          }
        })

        setPlans(convertedPlans)
      } catch (err) {
        console.error('Błąd pobierania planów:', err)
        setError(err instanceof Error ? err.message : 'Nieznany błąd')
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [])

  return { plans, loading, error, refetch: () => setLoading(true) }
}

// Hook do pobierania pojedynczego planu
export function useSubscriptionPlan(planId: string) {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', planId)
          .eq('is_active', true)
          .single()

        if (error) {
          throw error
        }

        // Konwertuj ceny z groszy na PLN
        const monthlyGross = data.price_monthly_gross / 100
        const yearlyGross = data.price_yearly_gross / 100
        const monthlyFromYearly = yearlyGross / 12
        const savings = monthlyGross - monthlyFromYearly

        const convertedPlan: SubscriptionPlan = {
          ...data,
          price_monthly_net: Number((data.price_monthly_net / 100).toFixed(2)),
          price_monthly_gross: Number(monthlyGross.toFixed(2)),
          price_yearly_net: Number((data.price_yearly_net / 100).toFixed(2)),
          price_yearly_gross: Number(yearlyGross.toFixed(2)),
          estimated_monthly_savings: Math.round(Math.max(0, savings))
        }

        setPlan(convertedPlan)
      } catch (err) {
        console.error('Błąd pobierania planu:', err)
        setError(err instanceof Error ? err.message : 'Nieznany błąd')
      } finally {
        setLoading(false)
      }
    }

    if (planId) {
      fetchPlan()
    }
  }, [planId])

  return { plan, loading, error }
}