'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { 
  Shield, 
  Eye, 
  Star, 
  Users, 
  MapPin, 
  Trash2, 
  Settings,
  Search,
  Bell,
  TrendingUp
} from 'lucide-react'

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Sprawdź czy użytkownik ma aktywną subskrypcję
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (!subscription) {
          router.push('/subscription')
          return
        }
        
        // Sprawdź czy profil jest uzupełniony
        if (!user.user_metadata?.profile_completed) {
          router.push('/complete-profile')
          return
        }
        setUser(user)
      } else {
        router.push('/login')
      }
      setLoading(false)
    }

    getUser()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-[#081D44] mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Ładowanie...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Witaj, {user.user_metadata?.first_name}!
          </h1>
          <p className="text-gray-600 mt-1">
            Zarządzaj reputacją swojej firmy {user.user_metadata?.company} w jednym miejscu
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-accent" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">12</p>
                <p className="text-sm text-gray-600">Monitorowane źródła</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">4.2</p>
                <p className="text-sm text-gray-600">Średnia ocena</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">+8%</p>
                <p className="text-sm text-gray-600">Wzrost pozytywnych</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">3</p>
                <p className="text-sm text-gray-600">Nowe powiadomienia</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Ostatnia aktywność</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-900">Nowa pozytywna opinia na Google</p>
                      <p className="text-xs text-gray-500">5 minut temu</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Search className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-900">Wykryto nową wzmiankę w mediach społecznościowych</p>
                      <p className="text-xs text-gray-500">2 godziny temu</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Trash2 className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-900">Zgłoszono negatywną opinię do usunięcia</p>
                      <p className="text-xs text-gray-500">1 dzień temu</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Szybkie akcje</h2>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <Search className="h-5 w-5 text-accent" />
                    <span className="ml-3 text-sm font-medium">Wyszukaj opinie</span>
                  </div>
                </button>
                
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-accent" />
                    <span className="ml-3 text-sm font-medium">Zarządzaj profilami</span>
                  </div>
                </button>
                
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-accent" />
                    <span className="ml-3 text-sm font-medium">Google Maps</span>
                  </div>
                </button>
                
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <a href="/profile" className="flex items-center">
                    <Settings className="h-5 w-5 text-accent" />
                    <span className="ml-3 text-sm font-medium">Profil użytkownika</span>
                  </a>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Services Overview */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Dostępne usługi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
              <Eye className="h-10 w-10 text-accent mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Monitoring opinii</h3>
              <p className="text-gray-600 text-sm mb-4">
                Śledź opinie i wzmianki o Twojej firmie w czasie rzeczywistym
              </p>
              <button className="btn-secondary text-sm">Zarządzaj</button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
              <Users className="h-10 w-10 text-accent mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile biznesowe</h3>
              <p className="text-gray-600 text-sm mb-4">
                Kontroluj informacje o firmie na wszystkich platformach
              </p>
              <button className="btn-secondary text-sm">Zarządzaj</button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
              <Trash2 className="h-10 w-10 text-accent mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Usuwanie wpisów</h3>
              <p className="text-gray-600 text-sm mb-4">
                Profesjonalne usuwanie negatywnych opinii i wpisów
              </p>
              <button className="btn-secondary text-sm">Złóż wniosek</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
