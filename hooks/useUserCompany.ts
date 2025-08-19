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
      console.log('🔥 Starting saveCompany function with data:', companyData)
      
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 Current user:', user ? { id: user.id, email: user.email } : 'not logged in')
      
      if (!user) {
        throw new Error('Użytkownik nie jest zalogowany')
      }

      // Test połączenia z bazą danych
      console.log('🔗 Testing database connection...')
      const { data: testData, error: testError } = await supabase
        .from('user_companies')
        .select('count')
        .limit(1)
      
      console.log('📊 Database test result:', { testData, testError })
      
      if (testError) {
        console.error('❌ Database connection test failed:', testError)
        if (testError.message.includes('relation "user_companies" does not exist')) {
          throw new Error('Tabela user_companies nie istnieje w bazie danych')
        }
        if (testError.code === '42501') {
          throw new Error('Brak uprawnień do tabeli user_companies - sprawdź RLS policies')
        }
        throw new Error(`Test połączenia z bazą nieudany: ${testError.message}`)
      }

      console.log('💾 Saving company data to database:', companyData)

      // Sprawdź czy firma już istnieje dla tego użytkownika
      console.log('🔍 Checking if company exists for user:', user.id)
      const { data: existingCompany, error: checkError } = await supabase
        .from('user_companies')
        .select('*')
        .eq('user_id', user.id)
        .single()

      console.log('📊 Check existing company result:', { 
        data: existingCompany, 
        error: checkError 
      })

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
      
      console.log('📦 Company payload prepared:', companyPayload)

      let result

      if (existingCompany) {
        // Aktualizuj istniejącą firmę
        console.log('🔄 Updating existing company for user:', user.id)
        result = await supabase
          .from('user_companies')
          .update(companyPayload)
          .eq('user_id', user.id)
          .select()
          .single()
        console.log('📝 Update result:', result)
      } else {
        // Utwórz nową firmę
        console.log('✨ Creating new company for user:', user.id)
        result = await supabase
          .from('user_companies')
          .insert([companyPayload])
          .select()
          .single()
        console.log('📝 Insert result:', result)
      }

      console.log('🔍 Final database operation result:', {
        data: result.data,
        error: result.error,
        status: result.status,
        statusText: result.statusText
      })

      if (result.error) {
        console.error('❌ Database error:', result.error)
        console.error('❌ Database error code:', result.error.code)
        console.error('❌ Database error details:', result.error.details)
        console.error('❌ Database error hint:', result.error.hint)
        console.error('❌ Database error message:', result.error.message)
        
        // Sprawdź czy to błąd duplikatu NIP
        if (result.error.message.includes('duplicate key value violates unique constraint "user_companies_nip_key"')) {
          throw new Error('Ta firma jest już zarejestrowana w systemie przez innego użytkownika. Każda firma może być przypisana tylko do jednego konta.')
        }
        
        // Sprawdź czy to błąd braku tabeli
        if (result.error.message.includes('relation "user_companies" does not exist') || 
            result.error.code === '42P01') {
          throw new Error('Tabela firm nie istnieje w bazie danych. Skontaktuj się z administratorem.')
        }
        
        // Sprawdź czy to błąd uprawnień
        if (result.error.code === '42501' || result.error.message.includes('permission denied')) {
          throw new Error('Brak uprawnień do tabeli firm. Sprawdź konfigurację RLS.')
        }
        
        throw new Error(`Błąd bazy danych: ${result.error.message}`)
      }

      console.log('✅ Company saved successfully:', result.data)
      setCompany(result.data)
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił błąd podczas zapisywania firmy'
      console.error('💥 Save company error caught:', {
        error: err,
        errorMessage: errorMessage,
        stack: err instanceof Error ? err.stack : 'no stack'
      })
      setError(errorMessage)
      return false
    } finally {
      console.log('🏁 SaveCompany function finished, setting loading to false')
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
