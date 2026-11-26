import type { Metadata, Viewport } from 'next'

// The admin, login included, is an installable app of its own, "Suricate Pro" (Bruno's phone home
// screen). Its manifest scope is /admin; the customer site has another one ("Suricate", scope /).
export const metadata: Metadata = {
  title: 'Suricate Admin',
  manifest: '/admin-app/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Suricate Pro', statusBarStyle: 'default' },
  icons: { apple: '/admin-app/apple-touch-icon.png' },
}

export const viewport: Viewport = { themeColor: '#ffffff' }

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children
}
