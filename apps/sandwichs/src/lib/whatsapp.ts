// "Livrée" message: Bruno sends it himself from his phone through a WhatsApp click-to-chat
// link (https://wa.me/<number>?text=…). No API, no account, nothing sent by the server.
import { findDeliveryPoint } from './delivery-points'

type DeliveredOrder = {
  code: string
  customerName: string
  phone: string
  deliveryPointId: string | null
  addressLabel: string
}

/**
 * Normalizes a phone number typed by a customer to E.164 (+33612345678).
 * French national numbers (06 12 34 56 78) get +33; 0033… and +… are kept as international.
 * Returns null when it doesn't look like a phone number.
 */
export function toE164(raw: string): string | null {
  let n = raw.replace(/[\s.\-()]/g, '')
  if (n.startsWith('00')) n = `+${n.slice(2)}`
  else if (/^0\d{9}$/.test(n)) n = `+33${n.slice(1)}`
  else if (/^33\d{9}$/.test(n)) n = `+${n}`
  if (n.startsWith('+330')) n = `+33${n.slice(4)}` // "+33 06…"
  return /^\+[1-9]\d{7,14}$/.test(n) ? n : null
}

/** Short French text telling the customer their order has arrived. */
export function deliveredText(order: Omit<DeliveredOrder, 'phone'>): string {
  const point = order.deliveryPointId ? findDeliveryPoint(order.deliveryPointId) : undefined
  const where = (point?.name ?? order.addressLabel).replace(/[’‘]/g, "'")
  const firstName = order.customerName.trim().split(/\s+/)[0]
  return `Suricate : bonjour ${firstName}, votre commande ${order.code} est arrivée : ${where}. Bon appétit !`
}

/** wa.me link opening WhatsApp on Bruno's phone with the message ready; null if the number is invalid. */
export function deliveredWhatsAppLink(order: DeliveredOrder): string | null {
  const to = toE164(order.phone)
  if (!to) return null
  return `https://wa.me/${to.slice(1)}?text=${encodeURIComponent(deliveredText(order))}`
}
