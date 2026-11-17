import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'
import QRCode from 'qrcode'
import { getSettings } from '@/lib/queries'
import { siteUrl } from '@/lib/site-url'
import { formatCutoff } from '@/lib/time'

export const dynamic = 'force-dynamic'

const WIDTH = 1080
const HEIGHT = 1350

/**
 * Portrait poster (logo, QR code, cutoff, address) that Bruno shares from /admin/qr: it reads
 * well as a WhatsApp image or an Instagram post. The bare QR code is at /qr.
 */
export async function GET(request: NextRequest) {
  const url = siteUrl(request.nextUrl.origin)
  const [settings, logo, qr] = await Promise.all([
    getSettings(),
    fetch(new URL('/qr-logo.png', request.url)).then((res) => res.arrayBuffer()),
    QRCode.toDataURL(url, { width: 640, margin: 0, errorCorrectionLevel: 'M' }),
  ])
  // Transparent, profile-free copy of the logo (the original's color profile renders it on grey).
  const logoSrc = `data:image/png;base64,${Buffer.from(logo).toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          color: '#171717',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={600} height={140} alt='' />
        <div style={{ marginTop: 28, fontSize: 46, color: '#404040' }}>Sandwichs livrés le midi</div>
        <div
          style={{
            marginTop: 56,
            padding: 40,
            display: 'flex',
            borderRadius: 48,
            border: '3px solid #e5e5e5',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} width={560} height={560} alt='' />
        </div>
        <div style={{ marginTop: 56, fontSize: 44, color: '#404040' }}>
          {`Commandez avant ${formatCutoff(settings.cutoffMinutes)}`}
        </div>
        <div style={{ marginTop: 12, fontSize: 52, fontWeight: 700 }}>{url.replace(/^https?:\/\//, '')}</div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, headers: { 'Cache-Control': 'no-store' } }
  )
}
