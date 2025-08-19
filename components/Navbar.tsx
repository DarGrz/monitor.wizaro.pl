'use client'

import Link from 'next/link'
import { Shield, Bell, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    // Nasłuchuj zmian stanu autoryzacji
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center">
              <Shield className="h-8 w-8 text-[#081D44]" />
              <span className="ml-2 text-2xl font-bold text-[#081D44]">Wizaro Monitor</span>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-6 bg-gray-200 animate-pulse rounded"></div>
              <div className="w-24 h-10 bg-gray-200 animate-pulse rounded"></div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center">
            <Shield className="h-8 w-8 text-[#081D44]" />
            <span className="ml-2 text-2xl font-bold text-[#081D44]">Wizaro Monitor</span>
          </Link>
          
          {user ? (
            // Navbar dla zalogowanych użytkowników
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/dashboard" className="text-gray-600 hover:text-[#081D44] font-medium transition-colors">
                  Dashboard
                </Link>
                <Link href="/subscription" className="text-gray-600 hover:text-[#081D44] font-medium transition-colors">
                  Subskrypcja
                </Link>
                <Link href="/profile" className="text-gray-600 hover:text-[#081D44] font-medium transition-colors">
                  Profil
                </Link>
              </nav>
              
              <Bell className="h-6 w-6 text-gray-400 hover:text-[#081D44] cursor-pointer transition-colors" />
              
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user.user_metadata?.first_name} {user.user_metadata?.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{user.user_metadata?.company}</p>
                </div>
                <Link 
                  href="/profile"
                  className="w-8 h-8 bg-[#081D44] rounded-full flex items-center justify-center hover:bg-[#081D44]/90 transition-colors"
                >
                  <span className="text-white text-sm font-medium">
                    {user.user_metadata?.first_name?.[0] || 'U'}{user.user_metadata?.last_name?.[0] || ''}
                  </span>
                </Link>
              </div>
              
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Wyloguj"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          ) : (
            // Navbar dla niezalogowanych użytkowników
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-600 hover:text-[#081D44] font-medium transition-colors">
                Logowanie
              </Link>
              <Link href="/register" className="btn-primary">
                Rejestracja
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
