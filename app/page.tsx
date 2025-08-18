import Link from 'next/link'
import { Shield, Eye, Star, Users, MapPin, Trash2 } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-[#081D44]" />
              <span className="ml-2 text-2xl font-bold text-[#081D44]">Wizaro Monitor</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-600 hover:text-[#081D44] font-medium">
                Logowanie
              </Link>
              <Link href="/register" className="btn-primary">
                Rejestracja
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Chroń swoją reputację <span className="text-accent">online</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Kompleksowa ochrona reputacji biznesowej. Monitorowanie opinii, zarządzanie profilami biznesowymi, 
            usuwanie niechcianych wpisów i ochrona Twojej marki w internecie.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-lg px-8 py-3">
              Rozpocznij za darmo
            </Link>
            <Link href="#features" className="btn-secondary text-lg px-8 py-3">
              Dowiedz się więcej
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Kompleksowa ochrona reputacji
            </h2>
            <p className="text-xl text-gray-600">
              Wszystko czego potrzebujesz do zarządzania reputacją online w jednym miejscu
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <Eye className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Monitoring opinii</h3>
              <p className="text-gray-600">
                Śledź opinie o Twojej firmie na wszystkich platformach w czasie rzeczywistym
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <Users className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Profile biznesowe</h3>
              <p className="text-gray-600">
                Zarządzaj swoimi profilami biznesowymi i kontroluj informacje o firmie
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <Trash2 className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Usuwanie wpisów</h3>
              <p className="text-gray-600">
                Profesjonalne usuwanie niechcianych wpisów i negatywnych opinii
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <MapPin className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Google Maps</h3>
              <p className="text-gray-600">
                Zarządzanie obecnością w Google Maps i usuwanie niepotrzebnych wizytówek
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <Star className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Analityka reputacji</h3>
              <p className="text-gray-600">
                Szczegółowe raporty i analiza trendów dotyczących Twojej reputacji online
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <Shield className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Ochrona prewencyjna</h3>
              <p className="text-gray-600">
                Proaktywna ochrona przed negatywnymi opiniami i atakami na reputację
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#081D44]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Gotowy na ochronę swojej reputacji?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Dołącz do tysięcy firm, które już chronią swoją reputację z Wizaro Monitor
          </p>
          <Link href="/register" className="bg-[#6C9F5D] hover:bg-[#6C9F5D]/90 text-white font-medium text-lg px-8 py-3 rounded-lg transition-colors">
            Rozpocznij teraz
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Shield className="h-6 w-6 text-[#081D44]" />
              <span className="ml-2 text-lg font-semibold text-[#081D44]">Wizaro Monitor</span>
            </div>
            <div className="text-gray-600">
              © 2024 Wizaro Monitor. Wszystkie prawa zastrzeżone.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
