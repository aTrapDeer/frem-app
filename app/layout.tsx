import type React from "react"
import type { Metadata } from "next"
import { Inter, DM_Sans } from "next/font/google"
import "./globals.css"
import { SessionProvider } from '@/components/session-provider'
import { AuthProvider } from '@/contexts/auth-context'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "FREM — Forward your finances",
  description: "Track → Visualize → Optimize your money with intelligent financial management.",
  keywords: ["finance", "budgeting", "money management", "financial planning"],
  authors: [{ name: "FREM Team" }],
  openGraph: {
    title: "FREM — Forward your finances",
    description: "Track → Visualize → Optimize your money with intelligent financial management.",
    url: "https://frem.app",
    siteName: "FREM",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "FREM - Forward your finances",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FREM — Forward your finances",
    description: "Track → Visualize → Optimize your money with intelligent financial management.",
    images: ["/api/og"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <body className={`${inter.className} antialiased`}>
        <SessionProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
