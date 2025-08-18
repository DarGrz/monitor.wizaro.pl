'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Mail, CheckCircle, Clock } from 'lucide-react'

export default function EmailConfirmation() {
  const [email, setEmail] = useState('')

  useEffect(() => {
    // Pobierz email z URL parametrów lub local storage
    const urlParams = new URLSearchParams(window.location.search)
    const emailParam = urlParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="relative">
              <Shield className="h-12 w-12 text-[#081D44]" />
              <CheckCircle className="h-6 w-6 text-green-500 absolute -top-1 -right-1 bg-white rounded-full" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Sprawdź swoją skrzynkę email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Wysłaliśmy link aktywacyjny na Twój adres email
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <Mail className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Link aktywacyjny został wysłany
              </h3>
              {email && (
                <p className="mt-1 text-sm text-blue-600">
                  Na adres: <strong>{email}</strong>
                </p>
              )}
              <p className="mt-2 text-sm text-blue-600">
                Kliknij w link w wiadomości email, aby aktywować swoje konto i dokończyć rejestrację.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <Clock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">
                Ważne informacje:
              </h4>
              <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside space-y-1">
                <li>Link jest ważny przez 24 godziny</li>
                <li>Sprawdź folder spam, jeśli nie widzisz wiadomości</li>
                <li>Po kliknięciu w link zostaniesz przekierowany do uzupełnienia profilu</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Nie otrzymałeś wiadomości email?
            </p>
            <Link
              href="/register?resend=true"
              className="text-sm font-medium text-accent hover:text-[#5a8a4d] underline"
            >
              Wyślij ponownie link aktywacyjny
            </Link>
          </div>

          <div className="text-center pt-4 border-t border-gray-200">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-[#081D44]"
            >
              ← Powrót do strony głównej
            </Link>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Masz już konto?
          </h4>
          <Link
            href="/login"
            className="text-sm font-medium text-accent hover:text-[#5a8a4d] underline"
          >
            Zaloguj się tutaj
          </Link>
        </div>
      </div>
    </div>
  )
}
