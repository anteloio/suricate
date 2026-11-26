'use client'

import {
  CalendarDays,
  ClipboardList,
  ExternalLink,
  LogOut,
  MapPin,
  Menu as MenuIcon,
  QrCode,
  Settings,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { logout } from '@/app/admin/actions'

const NAV = [
  { href: '/admin', label: 'Commandes', icon: ClipboardList },
  { href: '/admin/jours', label: 'Jours', icon: CalendarDays },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/admin/livraison', label: 'Livraison', icon: MapPin },
  { href: '/admin/reglages', label: 'Réglages', icon: Settings },
  { href: '/admin/qr', label: 'QR code', icon: QrCode },
]

const item =
  'flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900'

/**
 * Admin frame, Vercel-style: a sidebar on a computer; on a phone (Bruno's case) a top bar whose
 * menu button slides the same sidebar in.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close the drawer once a link has been followed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false)
  }, [pathname])

  const isActive = (href: string) => (href === '/admin' ? pathname === href : pathname.startsWith(href))

  const sidebar = (
    <nav className='flex h-full flex-col gap-6 px-3 py-4' aria-label='Navigation admin'>
      <div className='flex items-center justify-between px-2'>
        <Brand />
        <button
          type='button'
          className='rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 md:hidden'
          aria-label='Fermer le menu'
          onClick={() => setOpen(false)}
        >
          <X className='size-5' aria-hidden />
        </button>
      </div>
      <ul className='flex flex-col gap-0.5'>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`${item} ${active ? 'bg-neutral-100 font-medium text-neutral-900' : ''}`}
              >
                <Icon className='size-4 shrink-0' strokeWidth={1.75} aria-hidden />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
      <div className='mt-auto flex flex-col gap-0.5 border-t border-neutral-200 pt-4'>
        <Link href='/' target='_blank' className={item}>
          <ExternalLink className='size-4 shrink-0' strokeWidth={1.75} aria-hidden />
          Voir le site
        </Link>
        <form action={logout}>
          <button className={`${item} w-full`}>
            <LogOut className='size-4 shrink-0' strokeWidth={1.75} aria-hidden />
            Déconnexion
          </button>
        </form>
      </div>
    </nav>
  )

  const current = NAV.find((n) => isActive(n.href))

  return (
    <div className='min-h-dvh bg-neutral-50'>
      {/* Computer: fixed sidebar. */}
      <aside className='no-print fixed inset-y-0 left-0 hidden w-60 border-r border-neutral-200 bg-white md:block'>
        {sidebar}
      </aside>

      {/* Phone: top bar + drawer. */}
      <header className='no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur md:hidden'>
        <button
          type='button'
          className='-ml-1.5 rounded-lg p-1.5 text-neutral-700 hover:bg-neutral-100'
          aria-label='Ouvrir le menu'
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <MenuIcon className='size-5' aria-hidden />
        </button>
        <span className='text-sm font-medium'>{current?.label ?? 'Admin'}</span>
        <span className='ml-auto'>
          <Brand />
        </span>
      </header>
      <div className={`no-print fixed inset-0 z-30 md:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl transition-transform duration-200 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          inert={!open}
        >
          {sidebar}
        </aside>
      </div>

      <Toaster position='bottom-center' />
      {/* Same frame (width, padding) for every admin page; each page renders its own <main>. */}
      <div className='md:pl-60'>
        <div className='mx-auto max-w-3xl px-4 py-6 pb-16 md:px-8 md:py-10'>{children}</div>
      </div>
    </div>
  )
}

/** Like Vercel's team switcher: app icon, name, role. */
function Brand() {
  return (
    <Link href='/admin' className='flex items-center gap-2'>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src='/admin-app/icon-192.png' alt='' className='size-7 rounded-md ring-1 ring-neutral-200' />
      <span className='text-sm font-semibold'>Suricate</span>
      <span className='rounded-full border border-neutral-200 px-1.5 py-px text-[11px] text-neutral-500'>Admin</span>
    </Link>
  )
}
