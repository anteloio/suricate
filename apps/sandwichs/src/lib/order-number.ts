// Order numbers shown to customers and to Bruno: delivery day + sequence of that day, e.g.
// "20261127-001". An order gets its number once paid, so Bruno's list has no gaps. URLs and
// "Mes commandes" keep using the random `code`: sequential numbers in URLs would let anyone
// browse other people's orders.

/** "2026-11-27" → "20261127" */
export function orderNumberPrefix(serviceDate: string): string {
  return serviceDate.replaceAll('-', '')
}

/** The number to show; orders not paid yet only have their code. */
export function orderLabel(order: { number: string | null; code: string }): string {
  return order.number ?? order.code
}
