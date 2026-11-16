// Every business rule uses Europe/Paris time, whatever the server timezone (Vercel runs in UTC).
export const TIMEZONE = 'Europe/Paris'

export type ParisNow = { date: string; minutes: number }

/** Paris calendar date (YYYY-MM-DD) and minutes since midnight for a given instant. */
export function parisNow(now: Date = new Date()): ParisNow {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)!.value
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  }
}

/** Adds days to a YYYY-MM-DD date (pure calendar arithmetic, no timezone involved). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Open days customers can still order for: future days, or today before the cutoff. */
export function orderableDays(openDays: string[], cutoffMinutes: number, now: ParisNow = parisNow()): string[] {
  return [...new Set(openDays)].filter((d) => d > now.date || (d === now.date && now.minutes < cutoffMinutes)).sort()
}

export function formatCutoff(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** "mardi 18 novembre" */
export function formatDay(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}

/** "Aujourd'hui", "Demain" or "mardi 18 novembre" */
export function relativeDay(date: string, now: ParisNow = parisNow()): string {
  if (date === now.date) return "Aujourd'hui"
  if (date === addDays(now.date, 1)) return 'Demain'
  return formatDay(date)
}
