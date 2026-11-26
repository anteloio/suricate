import type { OrderStatus } from './db/schema'

// "Mes commandes": the customer's order codes, kept only on their device (localStorage).
// There are no customer accounts; the server returns orders only for the codes it is given.

export const ORDER_HISTORY_KEY = 'suricate:commandes'
export const MAX_HISTORY = 30
export const ORDER_CODE_RE = /^[A-Z0-9]{5}$/

/** Reads the stored list, dropping anything that isn't an order code. Newest first. */
export function parseHistory(raw: string | null): string[] {
  try {
    const value: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(value)) return []
    const codes = value.filter((c): c is string => typeof c === 'string' && ORDER_CODE_RE.test(c))
    return [...new Set(codes)].slice(0, MAX_HISTORY)
  } catch {
    return []
  }
}

/** Puts a new code first (once) and keeps the list short. */
export function addToHistory(codes: string[], code: string): string[] {
  return [code, ...codes.filter((c) => c !== code)].slice(0, MAX_HISTORY)
}

export type HistoryOrder = {
  code: string
  number: string | null
  serviceDate: string
  status: OrderStatus
  totalCents: number
  paymentMethod: string
  where: string
  lines: { label: string; quantity: number }[]
}
