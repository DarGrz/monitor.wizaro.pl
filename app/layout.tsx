import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Wizaro Monitor - Kompleksowa Ochrona Reputacji Biznesowej",
    template: "%s | Wizaro Monitor"
  },
  description: "Kompleksowa ochrona reputacji biznesowej. Monitorowanie opinii, zarządzanie profilami biznesowymi, usuwanie niechcianych wpisów i ochrona Twojej marki w internecie.",
  keywords: [
    "ochrona reputacji",
    "monitoring opinii",
    "zarządzanie reputacją",
    "usuwanie negatywnych opinii",
    "Google Maps",
    "profile biznesowe",
    "analityka reputacji",
    "monitoring marki",
    "NIP",
    "GUS",
    "firma",
    "biznes"
  ],
  authors: [{ name: "Wizaro Monitor" }],
  creator: "Wizaro Monitor",
  publisher: "Wizaro Monitor",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: "https://monitor.wizaro.pl",
    title: "Wizaro Monitor - Kompleksowa Ochrona Reputacji Biznesowej",
    description: "Chroń swoją reputację online z Wizaro Monitor. Monitorowanie opinii, zarządzanie profilami biznesowymi i profesjonalna ochrona marki.",
    siteName: "Wizaro Monitor",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Wizaro Monitor - Ochrona Reputacji Biznesowej",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wizaro Monitor - Ochrona Reputacji Biznesowej",
    description: "Kompleksowa ochrona reputacji online. Monitorowanie opinii, zarządzanie profilami biznesowymi i usuwanie negatywnych wpisów.",
    images: ["/og-image.jpg"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  verification: {
    google: process.env.GOOGLE_VERIFICATION_CODE,
  },
  category: "business",
  alternates: {
    canonical: "https://monitor.wizaro.pl",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Wizaro Monitor",
    "format-detection": "telephone=no",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <head>
        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Theme colors */}
        <meta name="theme-color" content="#081D44" />
        <meta name="msapplication-TileColor" content="#081D44" />
        <meta name="msapplication-TileImage" content="/icon-192.svg" />
        
        {/* App titles */}
        <meta name="application-name" content="Wizaro Monitor" />
        <meta name="apple-mobile-web-app-title" content="Wizaro Monitor" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Structured Data for Business */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Wizaro Monitor",
              "description": "Kompleksowa ochrona wizerunku w sieci. Monitorowanie opinii, zarządzanie profilami biznesowymi i ochrona firmy online.",
              "url": "https://monitor.wizaro.pl",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "category": "SaaS"
              },
              "provider": {
                "@type": "Organization",
                "name": "Wizaro Monitor"
              },
              "featureList": [
                "Monitoring opinii w czasie rzeczywistym",
                "Zarządzanie profilami biznesowymi",
                "Usuwanie negatywnych wpisów",
                "Analityka reputacji",
                "Integracja z GUS",
                "Zarządzanie Google Maps"
              ]
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
