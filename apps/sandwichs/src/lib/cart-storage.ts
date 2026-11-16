/** Where the cart lives on the customer's phone, shared by the order form and the header badge. */
export const CART_KEY = 'suricate:panier'
/** Fired on window whenever the order form saves or clears the cart. */
export const CART_EVENT = 'suricate:panier'

/** Number of items in a saved cart, 0 when missing or unreadable. */
export function cartCount(raw: string | null): number {
  if (!raw) return 0
  try {
    const items: unknown = JSON.parse(raw)
    if (!Array.isArray(items)) return 0
    return items.reduce(
      (n: number, i: unknown) =>
        n +
        (i && typeof i === 'object' && Number.isInteger((i as { quantity?: unknown }).quantity)
          ? Math.max(0, (i as { quantity: number }).quantity)
          : 0),
      0
    )
  } catch {
    return 0
  }
}
