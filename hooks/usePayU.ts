'use client'

import { useState, useCallback } from 'react'

interface PayUSubscription {
  id: string
  user_id: string
  plan_id: string
  billing_cycle: 'monthly' | 'yearly'
  status: string
  current_period_start: string
  current_period_end: string
  trial_start?: string
  trial_end?: string
  amount_gross: number
  currency: string
  payment_method: string
}

interface UsePayUReturn {
  loading: boolean
  error: string | null
  subscription: PayUSubscription | null
  createPayment: (planId: string, billingCycle: 'monthly' | 'yearly') => Promise<void>
  getSubscription: () => Promise<PayUSubscription | null>
  hasActiveSubscription: () => boolean
}

export function usePayU(): UsePayUReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<PayUSubscription | null>(null)

  const createPayment = useCallback(async (
    planId: string,
    billingCycle: 'monthly' | 'yearly'
  ) => {
    setLoading(true)
    setError(null)

    try {
      // Pobierz plan z localStorage lub z API
      const planPrices = {
        basic: { monthly: 79900, yearly: 698800 }, // ceny w groszach
        professional: { monthly: 129900, yearly: 1229000 },
        enterprise: { monthly: 49100, yearly: 490800 }
      }

      const amount = planPrices[planId as keyof typeof planPrices]?.[billingCycle]
      
      if (!amount) {
        throw new Error('Nieprawidłowy plan lub okres płatności')
      }

      const response = await fetch('/api/payu/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingCycle,
          amount,
          customerData: {
            email: '', // Zostanie uzupełnione przez API
          },
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd'
      setError(errorMessage)
      console.error('Błąd podczas tworzenia płatności PayU:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const getSubscription = useCallback(async (): Promise<PayUSubscription | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/payu/subscription')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Wystąpił błąd podczas pobierania subskrypcji')
      }

      setSubscription(data.subscription)
      return data.subscription
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd'
      setError(errorMessage)
      console.error('Błąd podczas pobierania subskrypcji:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const hasActiveSubscription = useCallback((): boolean => {
    if (!subscription) return false
    
    const activeStatuses = ['active']
    return activeStatuses.includes(subscription.status)
  }, [subscription])

  return {
    loading,
    error,
    subscription,
    createPayment,
    getSubscription,
    hasActiveSubscription,
  }
}
