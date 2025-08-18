import Link from 'next/link'
import { Shield, AlertCircle } from 'lucide-react'

export default function AuthCodeError() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Shield className="h-12 w-12 text-[#081D44]" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Błąd autoryzacji
          </h2>
          <div className="mt-2 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="text-sm text-gray-600">
              Wystąpił błąd podczas procesu autoryzacji. Spróbuj ponownie.
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/login"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#081D44] hover:bg-[#081D44]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#081D44]"
          >
            Spróbuj ponownie
          </Link>
          
          <Link
            href="/"
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#081D44]"
          >
            Powrót do strony głównej
          </Link>
        </div>
      </div>
    </div>
  )
}
