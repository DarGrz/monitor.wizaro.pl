import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GUSCompanyData } from './useGUS'

interface UserCompany {
  id: string
  user_id: string
  company_name: string
  nip: string
  regon?: string
  krs?: string
  street?: string
  building_number?: string
  apartment_number?: string
  city?: string
  zip_code?: string
  created_at: string
  updated_at: string
}

interface UseUserCompanyResult {
  loading: boolean
  error: string
  company: UserCompany | null
  saveCompany: (companyData: GUSCompanyData) => Promise<boolean>
  getCompany: () => Promise<UserCompany | null>
  updateCompany: (companyData: Partial<UserCompany>) => Promise<boolean>
}

export function useUserCompany(): UseUserCompanyResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [company, setCompany] = useState<UserCompany | null>(null)
  const supabase = createClient()

  const saveCompany = useCallback(async (companyData: GUSCompanyData): Promise<boolean> => {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Użytkownik nie jest zalogowany')
      }

      console.log('💾 Saving company data to database:', companyData)

      // Sprawdź czy firma już istnieje dla tego użytkownika
      const { data: existingCompany } = await supabase
        .from('user_companies')
        .select('*')
        .eq('user_id', user.id)
        .single()

      const companyPayload = {
        user_id: user.id,
        company_name: companyData.name,
        nip: companyData.nip,
        regon: companyData.regon || null,
        krs: companyData.krs || null,
        street: companyData.street || null,
        building_number: companyData.buildingNumber || null,
        apartment_number: companyData.apartmentNumber || null,
        city: companyData.city || null,
        zip_code: companyData.zip || null,
      }

      let result

      if (existingCompany) {
        // Aktualizuj istniejącą firmę
        console.log('🔄 Updating existing company')
        result = await supabase
          .from('user_companies')
          .update(companyPayload)
          .eq('user_id', user.id)
          .select()
          .single()
      } else {
        // Utwórz nową firmę
        console.log('✨ Creating new company')
        result = await supabase
          .from('user_companies')
          .insert([companyPayload])
          .select()
          .single()
      }

      if (result.error) {
        console.error('❌ Database error:', result.error)
        throw new Error(result.error.message)
      }

      console.log('✅ Company saved successfully')
      setCompany(result.data)
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił błąd podczas zapisywania firmy'
      console.error('❌ Save company error:', errorMessage)
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const getCompany = useCallback(async (): Promise<UserCompany | null> => {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Użytkownik nie jest zalogowany')
      }

      console.log('🔍 Getting company data from database')

      const { data, error } = await supabase
        .from('user_companies')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No company found - this is ok
          console.log('ℹ️ No company found for user')
          setCompany(null)
          return null
        }
        throw new Error(error.message)
      }

      console.log('✅ Company loaded successfully')
      setCompany(data)
      return data

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił błąd podczas pobierania danych firmy'
      console.error('❌ Get company error:', errorMessage)
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const updateCompany = useCallback(async (companyData: Partial<UserCompany>): Promise<boolean> => {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Użytkownik nie jest zalogowany')
      }

      console.log('🔄 Updating company data')

      const { data, error } = await supabase
        .from('user_companies')
        .update(companyData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      console.log('✅ Company updated successfully')
      setCompany(data)
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił błąd podczas aktualizacji firmy'
      console.error('❌ Update company error:', errorMessage)
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  return {
    loading,
    error,
    company,
    saveCompany,
    getCompany,
    updateCompany,
  }
}

export type { UserCompany }
