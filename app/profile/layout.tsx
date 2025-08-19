import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Profil Użytkownika - Wizaro Monitor", 
  description: "Zarządzaj swoim profilem i danymi firmy w Wizaro Monitor. Edytuj dane osobowe, zaktualizuj informacje o firmie i zmień ustawienia konta.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
