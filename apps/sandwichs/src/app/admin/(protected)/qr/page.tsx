import { headers } from 'next/headers'
import { ShareQrButton } from '@/components/share-qr-button'
import { siteUrl } from '@/lib/site-url'

const POSTER = '/qr/affiche'

export default async function QrPage() {
  const h = await headers()
  const url = siteUrl(`${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`)
  return (
    // Same frame as every admin page; only the poster is kept phone-sized.
    <main className='space-y-4'>
      <div>
        <h1 className='text-2xl font-semibold'>QR code du site</h1>
        <p className='mt-1 text-neutral-600'>Envoyez-le aux clients ou imprimez-le : il ouvre le site.</p>
      </div>
      <div className='max-w-sm space-y-4'>
        <ShareQrButton imageUrl={POSTER} url={url} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={POSTER}
          alt={`QR code vers ${url}`}
          width={1080}
          height={1350}
          className='w-full rounded-2xl ring-1 ring-neutral-200'
        />
      </div>
    </main>
  )
}
