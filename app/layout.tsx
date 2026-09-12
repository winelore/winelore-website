import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Providers } from './providers'
import { PageTransition } from '@/components/PageTransition'
import './globals.css'



const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'WineLore - Beverage Competitions Dashboard',
  description: 'Discover and participate in beverage competitions on WineLore',
  generator: 'v0.app',
  // Icons come from app/icon.tsx and app/apple-icon.tsx; the manifest from
  // app/manifest.ts. Together with appleWebApp these make "Add to Home Screen"
  // on iOS launch WineLore as a standalone, full-screen app.
  appleWebApp: {
    capable: true,
    title: 'WineLore',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the layout run edge-to-edge under the notch / home indicator; the
  // mobile shell pads itself with env(safe-area-inset-*).
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <PageTransition>{children}</PageTransition>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
