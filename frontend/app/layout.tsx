import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ProfileProvider } from '@/lib/profile-context'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Funding Fit - Business Funding Eligibility',
  description: 'Discover grants, loans, and support schemes your UK business is eligible for',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased bg-white min-h-[100dvh] sm:bg-gray-300 sm:flex sm:items-start sm:justify-center sm:py-8">
        <ProfileProvider>
          <div className="w-full h-[100dvh] min-h-[100dvh] bg-white overflow-hidden relative sm:w-[390px] sm:h-[844px] sm:min-h-[844px] sm:shadow-2xl sm:rounded-3xl">
            {children}
          </div>
        </ProfileProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
