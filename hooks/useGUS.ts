import { useState } from 'react'

interface GUSCompanyData {
  name: string
  street: string
  buildingNumber: string
  apartmentNumber?: string
  city: string
  zip: string
  nip: string
  regon: string
  krs?: string
}

interface UseGUSResult {
  loading: boolean
  error: string
  searchCompany: (nip: string) => Promise<GUSCompanyData | null>
}

export function useGUS(): UseGUSResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const searchCompany = async (nip: string): Promise<GUSCompanyData | null> => {
    if (!nip) {
      setError('NIP jest wymagany')
      return null
    }

    setLoading(true)
    setError('')

    try {
      console.log('🔍 Searching for company with NIP:', nip)
      
      const response = await fetch('/api/gus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nip }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Błąd podczas pobierania danych')
      }

      if (data.success && data.data) {
        console.log('✅ Company data retrieved successfully')
        setError('')
        return data.data as GUSCompanyData
      } else {
        throw new Error('Nie znaleziono danych firmy')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd'
      console.error('❌ GUS search error:', errorMessage)
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    searchCompany,
  }
}

export type { GUSCompanyData }
