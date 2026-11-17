import { getSettings, getUpcomingOpenDays } from '@/lib/queries'

export const dynamic = 'force-dynamic'

/** Ordering cutoff and open days, for the countdown in the top bar (computed on the phone, Paris time). */
export async function GET() {
  try {
    const [settings, openDays] = await Promise.all([getSettings(), getUpcomingOpenDays()])
    return Response.json(
      { ok: true, cutoffMinutes: settings.cutoffMinutes, openDays: openDays.slice(0, 7) },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('horaires failed', err)
    return Response.json({ ok: false }, { status: 500 })
  }
}
