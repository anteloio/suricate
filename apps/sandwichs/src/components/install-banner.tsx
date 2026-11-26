'use client'

import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'

// "Plus tard" hides the banner for a day on this phone (time of the dismissal, in ms).
const DISMISSED_KEY = 'suricate:admin-install-dismissed'
const DISMISS_MS = 24 * 60 * 60 * 1000

/** Chrome/Android's install prompt event (not in the TypeScript DOM types yet). */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

type Offer = { kind: 'prompt'; event: InstallPromptEvent } | { kind: 'ios' }

/**
 * Offers to install the admin on the phone's home screen, when the browser allows it and the
 * admin isn't already running as the installed app. Android/Chrome: one tap opens the system
 * install dialog. iPhone (Safari has no install API): explains the Share → home screen steps.
 */
export function InstallBanner() {
  const [offer, setOffer] = useState<Offer | null>(null)

  useEffect(() => {
    navigator.serviceWorker?.register('/admin-sw.js', { scope: '/admin' }).catch(() => {})

    const installed =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    let dismissed = false
    try {
      dismissed = Date.now() - Number(localStorage.getItem(DISMISSED_KEY) ?? 0) < DISMISS_MS
    } catch {}
    if (installed || dismissed) return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setOffer({ kind: 'prompt', event: e as InstallPromptEvent })
    }
    const onInstalled = () => setOffer(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    // Safari on iPhone/iPad never fires beforeinstallprompt: show the manual steps right away.
    const ua = navigator.userAgent
    const iphone = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    const showIosSteps = () => setOffer({ kind: 'ios' })
    if (iphone && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) showIosSteps()

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!offer) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    } catch {}
    setOffer(null)
  }

  async function install() {
    if (offer?.kind !== 'prompt') return
    await offer.event.prompt()
    const { outcome } = await offer.event.userChoice
    // The event can only be used once; a refused prompt comes back on a later visit.
    setOffer(null)
    if (outcome === 'accepted') dismiss()
  }

  return (
    <aside className='no-print mb-4 flex items-start gap-3 rounded-2xl bg-neutral-900 p-4 text-white'>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src='/admin-app/icon-192.png' alt='' className='size-11 shrink-0 rounded-xl' />
      <div className='min-w-0 flex-1'>
        <p className='font-semibold'>Installer l’appli sur ce téléphone</p>
        {offer.kind === 'prompt' ? (
          <>
            <p className='text-sm text-neutral-300'>L’espace Bruno s’ouvre en un geste depuis l’écran d’accueil.</p>
            <button
              type='button'
              onClick={install}
              className='mt-3 flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900'
            >
              <Download aria-hidden className='size-4' />
              Installer
            </button>
          </>
        ) : (
          <p className='text-sm text-neutral-300'>
            Dans Safari, touchez <strong>Partager</strong> puis <strong>Sur l’écran d’accueil</strong>.
          </p>
        )}
      </div>
      <button
        type='button'
        onClick={dismiss}
        aria-label='Plus tard'
        className='-m-1 rounded-full p-1 text-neutral-400 hover:text-white'
      >
        <X aria-hidden className='size-5' />
      </button>
    </aside>
  )
}
