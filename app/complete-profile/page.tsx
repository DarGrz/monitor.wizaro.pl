'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Shield, User as UserIcon, Building, Search, MapPin, Mail } from 'lucide-react'
import { useGUS, GUSCompanyData } from '@/hooks/useGUS'
import { useUserCompany } from '@/hooks/useUserCompany'

export default function CompleteProfile() {
  const [user, setUser] = useState<User | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nip, setNip] = useState('')
  const [phone, setPhone] = useState('')
  const [companyData, setCompanyData] = useState<GUSCompanyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const { loading: gusLoading, error: gusError, searchCompany } = useGUS()
  const { loading: companyLoading, error: companyError, saveCompany } = useUserCompany()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        // Sprawdź czy profil jest już uzupełniony
        if (user.user_metadata?.profile_completed) {
          router.push('/dashboard')
        }
      } else {
        router.push('/login')
      }
    }

    getUser()
  }, [router, supabase.auth])

  const handleSearchNIP = async (nipValue?: string) => {
    const nipToSearch = nipValue || nip
    if (!nipToSearch || nipToSearch.length !== 10) {
      setError('NIP musi mieć dokładnie 10 cyfr')
      return
    }

    const result = await searchCompany(nipToSearch)
    if (result) {
      setCompanyData(result)
      setError('')
    }
  }

  const handleManualSearch = () => {
    handleSearchNIP()
  }

  const handleNipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setNip(value)
    
    // Wyczyść poprzednie dane firmy przy zmianie NIP
    if (companyData) setCompanyData(null)
    
    // Automatycznie wyszukaj po wprowadzeniu 10 cyfr
    if (value.length === 10) {
      console.log('🚀 Auto-searching for NIP:', value)
      await handleSearchNIP(value)
    }
  }

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!firstName.trim() || !lastName.trim() || !companyData) {
      setError('Wszystkie wymagane pola muszą być wypełnione')
      setLoading(false)
      return
    }

    try {
      console.log('💾 Starting profile completion process')

      // 1. Zapisz dane firmy do bazy danych
      const companySaved = await saveCompany(companyData)
      if (!companySaved) {
        throw new Error('Nie udało się zapisać danych firmy')
      }

      // 2. Aktualizuj metadane użytkownika (podstawowe dane osobowe)
      const { error: userError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          profile_completed: true
        }
      })

      if (userError) {
        throw new Error('Wystąpił błąd podczas aktualizacji profilu: ' + userError.message)
      }

      console.log('✅ Profile completed successfully')
      router.push('/dashboard')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił błąd podczas aktualizacji profilu'
      console.error('❌ Profile completion error:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-[#081D44] mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Ładowanie...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <UserIcon className="h-12 w-12 text-[#081D44]" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Uzupełnij swój profil
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Wprowadź swoje dane i NIP firmy, aby dokończyć konfigurację konta
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleCompleteProfile}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  Imię *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#081D44] focus:border-[#081D44]"
                  placeholder="Imię"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Nazwisko *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#081D44] focus:border-[#081D44]"
                  placeholder="Nazwisko"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="nip" className="block text-sm font-medium text-gray-700">
                NIP firmy *
              </label>
              <div className="mt-1 flex rounded-lg shadow-sm">
                <input
                  id="nip"
                  name="nip"
                  type="text"
                  required
                  maxLength={10}
                  className="flex-1 block px-3 py-2 border border-gray-300 rounded-l-lg placeholder-gray-400 focus:outline-none focus:ring-[#081D44] focus:border-[#081D44]"
                  placeholder="1234567890"
                  value={nip}
                  onChange={handleNipChange}
                />
                <button
                  type="button"
                  onClick={handleManualSearch}
                  disabled={!nip || nip.length !== 10 || gusLoading}
                  className="px-4 py-2 border border-l-0 border-gray-300 rounded-r-lg bg-[#081D44] text-white hover:bg-[#081D44]/90 focus:outline-none focus:ring-2 focus:ring-[#081D44] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {gusLoading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                NIP zostanie automatycznie wyszukany po wprowadzeniu 10 cyfr
              </p>
            </div>

            {gusError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {gusError}
              </div>
            )}

            {companyData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Building className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-sm font-medium text-green-800">Dane firmy z rejestru GUS</h3>
                </div>
                <div className="space-y-2 text-sm text-green-700">
                  <p><strong>Nazwa:</strong> {companyData.name}</p>
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>
                        {companyData.street}
                        {companyData.buildingNumber && ` ${companyData.buildingNumber}`}
                        {companyData.apartmentNumber && `/${companyData.apartmentNumber}`}
                      </p>
                      <p>{companyData.zip} {companyData.city}</p>
                    </div>
                  </div>
                  <p><strong>NIP:</strong> {companyData.nip}</p>
                  <p><strong>REGON:</strong> {companyData.regon}</p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Telefon (opcjonalnie)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#081D44] focus:border-[#081D44]"
                placeholder="+48 123 456 789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Mail className="h-4 w-4 text-blue-600 mr-2" />
                <p className="text-sm font-medium text-blue-800">Email konta</p>
              </div>
              <p className="text-sm text-blue-700">{user.email}</p>
            </div>
          </div>

          {(error || companyError) && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error || companyError}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || companyLoading || !companyData}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#081D44] hover:bg-[#081D44]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#081D44] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || companyLoading ? 'Zapisywanie...' : 'Dokończ konfigurację'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Pola oznaczone * są wymagane
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
