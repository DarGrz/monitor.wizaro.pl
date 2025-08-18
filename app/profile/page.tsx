'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { 
  Shield, 
  User as UserIcon, 
  Mail, 
  Building, 
  Save, 
  ArrowLeft,
  Eye,
  EyeOff,
  MapPin,
  Phone,
  Hash,
  Edit3
} from 'lucide-react'
import Link from 'next/link'
import { useUserCompany } from '@/hooks/useUserCompany'

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()
  const { company, getCompany, loading: companyLoading } = useUserCompany()

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        setFirstName(user.user_metadata?.first_name || '')
        setLastName(user.user_metadata?.last_name || '')
        setPhone(user.user_metadata?.phone || '')
        setEmail(user.email || '')
        
        // Pobierz dane firmy z bazy danych
        await getCompany()
      } else {
        router.push('/login')
      }
      setLoading(false)
    }

    loadUserData()
  }, [router, supabase.auth, getCompany]) // Dodanie getCompany z powrotem - teraz jest stabilny

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.updateUser({
        email: email,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
        }
      })

      if (error) {
        setError('Błąd podczas aktualizacji profilu: ' + error.message)
      } else {
        setMessage('Profil został zaktualizowany pomyślnie')
        setIsEditing(false)
      }
    } catch {
      setError('Wystąpił nieoczekiwany błąd')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('Nowe hasła się nie zgadzają')
      setSaving(false)
      return
    }

    if (newPassword.length < 6) {
      setError('Nowe hasło musi mieć co najmniej 6 znaków')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setError('Błąd podczas zmiany hasła: ' + error.message)
      } else {
        setMessage('Hasło zostało zmienione pomyślnie')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setError('Wystąpił nieoczekiwany błąd')
    } finally {
      setSaving(false)
    }
  }

  if (loading || companyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-[#081D44] mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Ładowanie profilu...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <Link 
                href="/dashboard"
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center">
                <UserIcon className="h-6 w-6 text-[#081D44] mr-3" />
                <h1 className="text-xl font-semibold text-gray-900">Profil użytkownika</h1>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center px-4 py-2 text-sm font-medium text-[#081D44] bg-[#081D44]/10 rounded-lg hover:bg-[#081D44]/20 transition-colors"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {isEditing ? 'Anuluj' : 'Edytuj'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dane osobowe */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-[#081D44]" />
                Dane osobowe
              </h2>
            </div>
            <div className="px-6 py-4">
              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Imię
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#081D44] focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nazwisko
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#081D44] focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#081D44] focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#081D44] focus:border-transparent"
                      placeholder="+48 123 456 789"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-[#081D44] hover:bg-[#081D44]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#081D44] disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-gray-900">{firstName} {lastName}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-gray-900">{email}</span>
                  </div>
                  {phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{phone}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dane firmy */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Building className="h-5 w-5 mr-2 text-[#081D44]" />
                Dane firmy
              </h2>
            </div>
            <div className="px-6 py-4">
              {company ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Nazwa firmy</h3>
                    <p className="text-gray-900">{company.company_name}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">NIP</h3>
                      
                        <span className="text-gray-900">{company.nip}</span>
                      
                    </div>
                    {company.regon && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">REGON</h3>
                        <span className="text-gray-900">{company.regon}</span>
                      </div>
                    )}
                  </div>

                  {(company.street || company.city) && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Adres</h3>
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-1" />
                        <div className="text-gray-900">
                          {company.street && (
                            <p>
                              {company.street}
                              {company.building_number && ` ${company.building_number}`}
                              {company.apartment_number && `/${company.apartment_number}`}
                            </p>
                          )}
                          {company.city && (
                            <p>{company.zip_code} {company.city}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
                    Dane pobrane z rejestru GUS w dniu: {new Date(company.created_at).toLocaleDateString('pl-PL')}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Brak danych firmy</p>
                  <Link
                    href="/complete-profile"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-[#081D44] hover:bg-[#081D44]/90"
                  >
                    Uzupełnij dane firmy
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zmiana hasła */}
        <div className="bg-white shadow rounded-lg mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Zmiana hasła</h2>
          </div>
          <div className="px-6 py-4">
            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nowe hasło
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#081D44] focus:border-transparent"
                    placeholder="Wprowadź nowe hasło"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Potwierdź nowe hasło
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#081D44] focus:border-transparent"
                    placeholder="Potwierdź nowe hasło"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || !newPassword || !confirmPassword}
                className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-[#081D44] hover:bg-[#081D44]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#081D44] disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Zapisywanie...' : 'Zmień hasło'}
              </button>
            </form>
          </div>
        </div>

        {/* Messages */}
        {(message || error) && (
          <div className="mt-6">
            {message && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4">
                {message}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
