import { Shield } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <Shield className="h-6 w-6 text-[#081D44]" />
            <span className="ml-2 text-lg font-semibold text-[#081D44]">Wizaro Monitor</span>
          </div>
          <div className="text-gray-600">
            © 2025 Wizaro Monitor. Wszystkie prawa zastrzeżone.
          </div>
        </div>
      </div>
    </footer>
  )
}
