import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Suricate · Sandwichs livrés à Sophia Antipolis',
  description: 'Commandez vos sandwichs Suricate avant 10h, livrés le midi à Sophia Antipolis.',
}

export const viewport: Viewport = { themeColor: '#ffffff' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='fr'>
      <body className='min-h-dvh'>{children}</body>
    </html>
  )
}
