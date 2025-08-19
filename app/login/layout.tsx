import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Logowanie - Wizaro Monitor",
  description: "Zaloguj się do swojego konta Wizaro Monitor. Zarządzaj reputacją swojej firmy, monitoruj opinie i chroń swoją markę online.",
  robots: {
    index: false,
    follow: true,
  },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
