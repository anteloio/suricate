'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatEuros } from '@/lib/money'
import { ORDER_HISTORY_KEY, parseHistory, type HistoryOrder } from '@/lib/order-history'
import { formatDay } from '@/lib/time'
import { StatusBadge } from './status-badge'

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; orders: HistoryOrder[] }

/** Lists the orders whose codes this device remembers, with their current status. */
export function OrderHistory() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    const codes = parseHistory(localStorage.getItem(ORDER_HISTORY_KEY))
    if (codes.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ kind: 'ready', orders: [] })
      return
    }
    fetch('/api/commandes/historique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codes }),
    })
      .then((res) => res.json())
      .then((data: { ok: boolean; orders?: HistoryOrder[] }) =>
        setState(data.ok && data.orders ? { kind: 'ready', orders: data.orders } : { kind: 'error' })
      )
      .catch(() => setState({ kind: 'error' }))
  }, [])

  if (state.kind === 'loading') return <p className='mt-8 text-center text-neutral-500'>Chargement…</p>
  if (state.kind === 'error') {
    return <p className='mt-8 text-center text-red-700'>Impossible de charger vos commandes. Réessayez plus tard.</p>
  }
  if (state.orders.length === 0) {
    return <p className='mt-8 text-center text-neutral-500'>Aucune commande pour le moment.</p>
  }
  return (
    <ul className='mt-6 space-y-3'>
      {state.orders.map((o) => (
        <li key={o.code}>
          <Link href={`/commande/${o.code}`} className='card block transition hover:ring-neutral-900'>
            <div className='flex items-center justify-between gap-2'>
              <p className='font-semibold'>
                {formatDay(o.serviceDate)} · {o.code}
              </p>
              <StatusBadge status={o.status} />
            </div>
            <ul className='mt-2 text-sm text-neutral-700'>
              {o.lines.map((l, i) => (
                <li key={i}>
                  {l.quantity} × {l.label}
                </li>
              ))}
            </ul>
            <p className='mt-2 flex justify-between text-sm'>
              <span className='text-neutral-500'>{o.where}</span>
              <strong className='shrink-0 pl-2 tabular-nums'>{formatEuros(o.totalCents)}</strong>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
