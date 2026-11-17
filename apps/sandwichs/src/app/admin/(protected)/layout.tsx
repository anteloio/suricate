import { headers } from 'next/headers'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { InstallBanner } from '@/components/install-banner'
import { ShareQrButton } from '@/components/share-qr-button'
import { requireAdmin } from '@/lib/auth'
import { siteUrl } from '@/lib/site-url'
import { logout } from '../actions'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/admin', label: 'Commandes' },
  { href: '/admin/jours', label: 'Jours' },
  { href: '/admin/menu', label: 'Menu' },
  { href: '/admin/reglages', label: 'Réglages' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  const h = await headers()
  const url = siteUrl(`${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`)
  return (
    <div className='mx-auto max-w-3xl px-4 pb-16'>
      <header className='no-print flex flex-wrap items-center justify-between gap-3 py-4'>
        <Logo href='/admin' className='h-9 w-auto' />
        <nav className='flex flex-wrap items-center gap-1 text-sm'>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className='rounded-full px-3 py-1.5 hover:bg-neutral-200'>
              {n.label}
            </Link>
          ))}
          <Link href='/' target='_blank' className='rounded-full px-3 py-1.5 text-neutral-500 hover:bg-neutral-200'>
            Site ↗
          </Link>
          <ShareQrButton
            url={url}
            className='flex items-center gap-1.5 rounded-full px-3 py-1.5 text-neutral-500 hover:bg-neutral-200'
          />
          <form action={logout}>
            <button className='rounded-full px-3 py-1.5 text-neutral-500 hover:bg-neutral-200'>Déconnexion</button>
          </form>
        </nav>
      </header>
      <InstallBanner />
      {children}
    </div>
  )
}
