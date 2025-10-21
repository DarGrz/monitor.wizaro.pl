'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Eye, EyeOff } from 'lucide-react'

// Note: Metadata export nie działa w client components, więc dodamy meta tagi w layout lub używając next/head

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError('Nieprawidłowy email lub hasło')
      } else {
        // Pobierz aktualne dane użytkownika
        const { data: { user } } = await supabase.auth.getUser()
        
        // Sprawdź czy profil jest uzupełniony
        if (user?.user_metadata?.profile_completed) {
          router.push('/dashboard')
        } else {
          router.push('/complete-profile')
        }
      }
    } catch {
      setError('Wystąpił błąd podczas logowania')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!email) {
      setError('Wprowadź adres email')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })

      if (error) {
        setError('Wystąpił błąd podczas wysyłania linku resetującego: ' + error.message)
      } else {
        setSuccess('Link do resetowania hasła został wysłany na Twój email')
      }
    } catch {
      setError('Wystąpił błąd podczas resetowania hasła')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Shield className="h-12 w-12 text-[#081D44]" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            {isResetMode ? 'Resetowanie hasła' : 'Logowanie do konta'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isResetMode ? (
              <>
                Wprowadź swój email, aby otrzymać link do resetowania hasła{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(false)
                    setError('')
                    setSuccess('')
                  }}
                  className="font-medium text-accent hover:text-[#5a8a4d]"
                >
                  lub wróć do logowania
                </button>
              </>
            ) : (
              <>
                Nie masz konta?{' '}
                <Link href="/register" className="font-medium text-accent hover:text-[#5a8a4d]">
                  Zarejestruj się
                </Link>
              </>
            )}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={isResetMode ? handleResetPassword : handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#081D44] focus:border-[#081D44]"
                placeholder="Wprowadź swój email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            {!isResetMode && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Hasło
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#081D44] focus:border-[#081D44]"
                    placeholder="Wprowadź swoje hasło"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#081D44] hover:bg-[#081D44]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#081D44] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading 
                ? (isResetMode ? 'Wysyłanie...' : 'Logowanie...') 
                : (isResetMode ? 'Wyślij link resetujący' : 'Zaloguj się')
              }
            </button>
          </div>

          {!isResetMode && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(true)
                  setError('')
                  setSuccess('')
                }}
                className="text-sm text-gray-600 hover:text-[#081D44] underline"
              >
                Zapomniałeś hasła?
              </button>
            </div>
          )}

          <div className="text-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-[#081D44]">
              ← Powrót do strony głównej
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
