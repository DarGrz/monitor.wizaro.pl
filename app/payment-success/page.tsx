'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMock = searchParams.get('mock') === 'true'

  useEffect(() => {
    if (isMock) {
      // Dla mock płatności, przekieruj po 3 sekundach do dashboard
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isMock, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        {isMock ? (
          <>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Płatność Mock PayU - Sukces!
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                To jest symulacja płatności PayU w trybie development.
              </p>
              <p className="mt-2 text-xs text-gray-400">
                Przekierowanie do dashboard za 3 sekundy...
              </p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Przejdź do Dashboard
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">
              Przetwarzanie płatności...
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Sprawdzamy status Twojej płatności PayU
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
