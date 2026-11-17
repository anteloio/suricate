'use client'

import { Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { formatCountdown, secondsBeforeCutoff } from '@/lib/time'

type Schedule = { cutoffMinutes: number; openDays: string[] }

/** Thin strip under the top bar during the last 30 minutes before today's ordering cutoff. */
export function CutoffCountdown() {
  const router = useRouter()
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [left, setLeft] = useState<number | null>(null)
  const wasCounting = useRef(false)

  useEffect(() => {
    const load = () =>
      fetch('/api/horaires', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data: { ok: boolean } & Partial<Schedule>) => {
          if (data.ok && typeof data.cutoffMinutes === 'number' && Array.isArray(data.openDays)) {
            setSchedule({ cutoffMinutes: data.cutoffMinutes, openDays: data.openDays })
          }
        })
        .catch(() => {})
    load()
    // Bruno may change the cutoff or open a day: refresh when the customer comes back to the tab.
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    if (!schedule) return
    const tick = () => {
      const s = secondsBeforeCutoff(schedule.openDays, schedule.cutoffMinutes)
      setLeft(s)
      // Cutoff just passed: reload the page data so today disappears from the menu.
      if (s === null && wasCounting.current) router.refresh()
      wasCounting.current = s !== null
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [schedule, router])

  if (left === null) return null
  return (
    <div role='status' className='border-t border-amber-200 bg-amber-50 text-amber-900'>
      <p className='mx-auto flex max-w-2xl items-center justify-center gap-1.5 px-4 py-1.5 text-sm'>
        <Clock className='size-4 shrink-0' strokeWidth={2} aria-hidden />
        <span>
          Plus que <strong className='tabular-nums'>{formatCountdown(left)}</strong> pour commander aujourd’hui
        </span>
      </p>
    </div>
  )
}
