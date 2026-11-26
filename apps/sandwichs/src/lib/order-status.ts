import type { OrderStatus } from '@/lib/db/schema'

/** The one place that says how each order status reads and looks, for customers and for Bruno. */
export const ORDER_STATUS: Record<OrderStatus, { label: string; adminLabel: string; className: string }> = {
  a_payer: { label: 'Paiement en attente', adminLabel: 'Non payée', className: 'bg-neutral-100 text-neutral-700' },
  // Paid, not prepared yet: customers just see "Confirmée" (Mes commandes), Bruno "À préparer".
  confirmee: { label: 'Confirmée', adminLabel: 'À préparer', className: 'bg-amber-100 text-amber-900' },
  livree: { label: 'Livrée', adminLabel: 'Livrée', className: 'bg-green-100 text-green-900' },
  annulee: { label: 'Annulée', adminLabel: 'Annulée', className: 'bg-red-100 text-red-900' },
}
