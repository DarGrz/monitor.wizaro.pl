import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Panel Użytkownika - Wizaro Monitor",
  description: "Dashboard zarządzania reputacją firmy. Monitoruj opinie, zarządzaj profilami biznesowymi i analizuj reputację swojej marki online.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
