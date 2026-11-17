'use client'

import { ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CART_EVENT, CART_KEY, cartCount } from '@/lib/cart-storage'
import { CutoffCountdown } from './cutoff-countdown'

/** The one top bar of the customer site: logo → menu, cart (when not empty), Mes commandes. */
export function SiteHeader() {
  const pathname = usePathname()
  const [count, setCount] = useState(0)
  const [hash, setHash] = useState('')

  useEffect(() => {
    const read = () => setCount(cartCount(localStorage.getItem(CART_KEY)))
    read()
    window.addEventListener(CART_EVENT, read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener(CART_EVENT, read)
      window.removeEventListener('storage', read)
    }
  }, [])

  // The menu's steps live in the hash (#panier, #livraison): the cart pill is "selected" on #panier.
  useEffect(() => {
    const read = () => setHash(window.location.hash.slice(1))
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [pathname])

  if (pathname.startsWith('/admin')) return null
  const onMenu = pathname === '/'
  const onHistory = pathname === '/mes-commandes'
  const onCart = onMenu && hash === 'panier'

  return (
    <header className='no-print sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur'>
      <div className='mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4'>
        <Link
          href='/'
          aria-label='Suricate, retour au menu'
          className='shrink-0'
          onClick={(e) => {
            // On the menu page the steps live in the hash: going "home" means back to step 1.
            if (onMenu) {
              e.preventDefault()
              window.location.hash = ''
            }
          }}
        >
          <Image src='/suricate.png' alt='Suricate' width={936} height={326} priority className='h-8 w-auto' />
        </Link>
        <nav className='flex items-center gap-2 text-sm font-medium'>
          {count > 0 && (
            // A plain link so the order form sees the hash change and opens the cart step.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a
              href='/#panier'
              aria-current={onCart ? 'page' : undefined}
              className={`nav-pill ${onCart ? 'nav-pill-active' : ''}`}
              aria-label={`Panier, ${count} article${count > 1 ? 's' : ''}`}
            >
              <ShoppingBag className='size-5' strokeWidth={2} aria-hidden />
              <span className='tabular-nums'>{count}</span>
            </a>
          )}
          <Link
            href='/mes-commandes'
            aria-current={onHistory ? 'page' : undefined}
            className={`nav-pill ${onHistory ? 'nav-pill-active' : ''}`}
          >
            Mes commandes
          </Link>
        </nav>
      </div>
      <CutoffCountdown />
    </header>
  )
}
