import type { Metadata, Viewport } from 'next'
import { SiteHeader } from '@/components/site-header'
import './globals.css'

export const metadata: Metadata = {
  title: 'Suricate · Sandwichs livrés le midi',
  description: 'Commandez vos sandwichs Suricate avant 10h, livrés le midi à votre point de livraison.',
}

export const viewport: Viewport = { themeColor: '#ffffff' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='fr'>
      <body className='min-h-dvh'>
        <SiteHeader />
        {children}
      </body>
    </html>
  )
}
