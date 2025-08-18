'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Eye, EyeOff } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isResend, setIsResend] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Sprawdź czy to ponowne wysyłanie z URL
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('resend') === 'true') {
      setIsResend(true)
    }
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Sprawdź czy to ponowne wysyłanie
    if (isResend) {
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email
        })

        if (error) {
          setError('Wystąpił błąd podczas wysyłania: ' + error.message)
        } else {
          setSuccess('Link aktywacyjny został wysłany ponownie na Twój email')
        }
      } catch {
        setError('Wystąpił błąd podczas wysyłania linku')
      } finally {
        setLoading(false)
      }
      return
    }

    if (password !== confirmPassword) {
      setError('Hasła się nie zgadzają')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków')
      setLoading(false)
      return
    }

    try {
      console.log('🚀 Starting registration process for email:', email)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            profile_completed: false
          }
        }
      })

      console.log('📧 Supabase signup response:', { 
        data: {
          user: data.user ? {
            id: data.user.id,
            email: data.user.email,
            email_confirmed_at: data.user.email_confirmed_at,
            user_metadata: data.user.user_metadata
          } : null,
          session: data.session ? 'present' : 'null'
        }, 
        error: error ? {
          message: error.message,
          status: error.status
        } : null
      })

      if (error) {
        console.error('❌ Registration error:', error)
        // Jeśli to rate limit, pokaż bardziej przyjazny komunikat
        if (error.message.includes('rate limit')) {
          setError('Zbyt wiele prób rejestracji. Spróbuj ponownie za chwilę lub użyj innego adresu email.')
        } else {
          setError('Wystąpił błąd podczas rejestracji: ' + error.message)
        }
        return
      }
      
      if (!data.user) {
        console.error('❌ No user returned from signup')
        setError('Wystąpił błąd podczas rejestracji')
        return
      }

      // Sprawdź czy wymagane jest potwierdzenie email
      if (!data.session) {
        // Email wymaga potwierdzenia
        console.log('✉️ Email confirmation required, redirecting to email-confirmation')
        const redirectUrl = `/email-confirmation?email=${encodeURIComponent(email)}`
        console.log('🔄 Redirecting to:', redirectUrl)
        
        // Użyj window.location zamiast router.push dla pewności
        window.location.href = redirectUrl
      } else {
        // Użytkownik jest automatycznie zalogowany
        console.log('🔓 User auto-logged in, redirecting to complete-profile')
        router.push('/complete-profile')
      }
    } catch {
      setError('Wystąpił błąd podczas rejestracji')
    } finally {
      setLoading(false)
    }
  }

  const handleResendActivation = () => {
    setIsResend(true)
    setError('')
    setSuccess('')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Shield className="h-12 w-12 text-[#081D44]" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            {isResend ? 'Wyślij ponownie link aktywacyjny' : 'Stwórz nowe konto'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isResend ? (
              <>
                Wprowadź swój email, aby otrzymać nowy link aktywacyjny{' '}
                <button
                  type="button"
                  onClick={() => setIsResend(false)}
                  className="font-medium text-accent hover:text-[#5a8a4d]"
                >
                  lub wróć do rejestracji
                </button>
              </>
            ) : (
              <>
                Masz już konto?{' '}
                <Link href="/login" className="font-medium text-accent hover:text-[#5a8a4d]">
                  Zaloguj się
                </Link>
              </>
            )}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
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

            {!isResend && (
              <>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Hasło
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#081D44] focus:border-[#081D44]"
                      placeholder="Minimum 6 znaków"
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

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Potwierdź hasło
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#081D44] focus:border-[#081D44]"
                      placeholder="Powtórz hasło"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </>
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
                ? (isResend ? 'Wysyłanie...' : 'Rejestracja...') 
                : (isResend ? 'Wyślij link aktywacyjny' : 'Zarejestruj się')
              }
            </button>
          </div>

          <div className="text-center">
            {!isResend && (
              <button
                type="button"
                onClick={handleResendActivation}
                className="text-sm text-gray-600 hover:text-[#081D44] underline"
              >
                Nie otrzymałeś linku aktywacyjnego? Wyślij ponownie
              </button>
            )}
          </div>

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
