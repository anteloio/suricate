import type { OrderStatus } from '@/lib/db/schema'
import { ORDER_STATUS } from '@/lib/order-status'

/** Status pill, identical on Mes commandes, the order page and the admin. */
export function StatusBadge({ status, admin = false }: { status: OrderStatus; admin?: boolean }) {
  const s = ORDER_STATUS[status]
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap ${s.className}`}>
      {admin ? s.adminLabel : s.label}
    </span>
  )
}
