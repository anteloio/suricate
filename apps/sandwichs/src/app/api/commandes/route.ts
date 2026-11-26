import { createOrder } from '@/lib/orders'
import { siteUrl } from '@/lib/site-url'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Requête invalide.' }, { status: 400 })
  }
  try {
    const result = await createOrder(body, siteUrl(new URL(request.url).origin))
    return Response.json(result, { status: result.ok ? 201 : 422 })
  } catch (err) {
    console.error('createOrder failed', err)
    return Response.json({ ok: false, error: 'Une erreur est survenue. Réessayez dans un instant.' }, { status: 500 })
  }
}
