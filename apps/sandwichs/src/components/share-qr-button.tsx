'use client'

import { Share2 } from 'lucide-react'
import { useEffect, useRef, useSyncExternalStore } from 'react'

const FILE_NAME = 'suricate-sandwichs.png'

// Phones can share image files through their share sheet; computers mostly can't.
const canShareFiles = () =>
  typeof navigator.canShare === 'function' &&
  navigator.canShare({ files: [new File([''], FILE_NAME, { type: 'image/png' })] })

/**
 * Opens the phone's share sheet (WhatsApp, Messages, …) with the poster image and the site's
 * address. Hidden where the browser can't share files (a computer). The image is fetched in
 * advance: phones only allow sharing right after the tap, not after a slow download.
 */
export function ShareQrButton({ imageUrl, url }: { imageUrl: string; url: string }) {
  const supported = useSyncExternalStore(noSubscribe, canShareFiles, () => false)
  const file = useRef<Promise<File | null>>(null)

  useEffect(() => {
    if (!supported) return
    file.current = fetch(imageUrl)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => (blob ? new File([blob], FILE_NAME, { type: 'image/png' }) : null))
      .catch(() => null)
  }, [supported, imageUrl])

  if (!supported) return null

  async function share() {
    const poster = await file.current
    const data: ShareData = { title: 'Suricate · Sandwichs', text: `Commandez vos sandwichs : ${url}` }
    try {
      await navigator.share(poster ? { ...data, files: [poster] } : { ...data, url })
    } catch {
      // Share sheet closed without sharing.
    }
  }

  return (
    <button type='button' onClick={share} className='btn-primary flex w-full items-center justify-center gap-2'>
      <Share2 aria-hidden className='size-5' />
      Partager
    </button>
  )
}

const noSubscribe = () => () => {}
