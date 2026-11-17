import QRCode from 'qrcode'
import type { NextRequest } from 'next/server'
import { siteUrl } from '@/lib/site-url'

/** PNG QR code pointing to the customer site, for flyers and for Bruno to share from /admin. */
export async function GET(request: NextRequest) {
  const png = await QRCode.toBuffer(siteUrl(request.nextUrl.origin), {
    type: 'png',
    width: 1024,
    margin: 4,
    errorCorrectionLevel: 'M',
  })
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': 'inline; filename="suricate-qr.png"',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
