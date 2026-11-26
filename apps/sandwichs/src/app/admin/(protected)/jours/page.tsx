import { getOrderCountsFrom, getSettings, getUpcomingOpenDays } from '@/lib/queries'
import { addDays, formatCutoff, formatDay, MAX_DAYS_AHEAD, parisNow } from '@/lib/time'
import { toggleDay } from '../../actions'

const DAYS_AHEAD = 28

export default async function DaysPage() {
  const now = parisNow()
  const [openDays, counts, settings] = await Promise.all([
    getUpcomingOpenDays(),
    getOrderCountsFrom(now.date),
    getSettings(),
  ])
  const open = new Set(openDays)
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(now.date, i))

  return (
    <main>
      <h1 className='text-2xl font-semibold'>Jours de livraison</h1>
      <p className='mt-1 text-neutral-600'>
        Ouvrez les jours où vous livrez. Les clients peuvent commander {MAX_DAYS_AHEAD} jours à l&apos;avance au plus,
        et jusqu&apos;à {formatCutoff(settings.cutoffMinutes)} le jour même.
      </p>
      <ul className='card mt-4 divide-y divide-neutral-100 p-0'>
        {days.map((date) => {
          const isOpen = open.has(date)
          const n = counts.get(date) ?? 0
          const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
          return (
            <li
              key={date}
              className={`flex items-center gap-3 px-4 py-2.5 ${weekday === 1 ? 'border-t-2 border-t-neutral-200' : ''}`}
            >
              <div className='flex-1'>
                <p className={`first-letter:uppercase ${weekday === 0 || weekday === 6 ? 'text-neutral-400' : ''}`}>
                  {formatDay(date)}
                  {date === now.date && <span className='ml-2 text-sm text-neutral-500'>(aujourd&apos;hui)</span>}
                </p>
                {n > 0 && (
                  <p className='text-sm text-neutral-500'>
                    {n} commande{n > 1 ? 's' : ''}
                    {!isOpen && ' : jour fermé, les commandes restent valables'}
                  </p>
                )}
              </div>
              <form action={toggleDay}>
                <input type='hidden' name='date' value={date} />
                <input type='hidden' name='open' value={isOpen ? '0' : '1'} />
                <button
                  className={`w-28 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    isOpen
                      ? 'bg-formule text-white hover:bg-formule-dark'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {isOpen ? 'Ouvert ✓' : 'Fermé'}
                </button>
              </form>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
