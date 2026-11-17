'use client'

import { QrCode } from 'lucide-react'
import { useEffect, useRef } from 'react'

const FILE_NAME = 'suricate-qr.png'

/**
 * Opens the phone's share sheet (WhatsApp, Messages, …) with the site's QR code and address.
 * The image is fetched in advance: phones only allow sharing right after the tap, not after a
 * slow download. Where sharing files isn't supported (most computers), the image is downloaded.
 */
export function ShareQrButton({ url, className }: { url: string; className?: string }) {
  const file = useRef<Promise<File | null>>(null)

  useEffect(() => {
    file.current = fetch('/qr')
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => (blob ? new File([blob], FILE_NAME, { type: 'image/png' }) : null))
      .catch(() => null)
  }, [])

  async function share() {
    const qr = await file.current
    if (qr && navigator.canShare?.({ files: [qr] })) {
      try {
        await navigator.share({ files: [qr], title: 'Suricate · Sandwichs', text: `Commandez vos sandwichs : ${url}` })
      } catch {
        // Share sheet closed without sharing.
      }
      return
    }
    const link = Object.assign(document.createElement('a'), { href: '/qr', download: FILE_NAME })
    link.click()
  }

  return (
    <button type='button' onClick={share} className={className}>
      <QrCode aria-hidden className='size-4' />
      QR code
    </button>
  )
}
