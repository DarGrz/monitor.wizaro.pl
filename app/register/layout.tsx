import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Rejestracja - Wizaro Monitor",
  description: "Załóż darmowe konto w Wizaro Monitor. Rozpocznij ochronę reputacji swojej firmy już dziś. Monitoring opinii, zarządzanie profilami biznesowymi i więcej.",
  robots: {
    index: true,
    follow: true,
  },
}

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
