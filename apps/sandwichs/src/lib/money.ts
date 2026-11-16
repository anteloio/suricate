const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

/** 650 -> "6,50 €" */
export function formatEuros(cents: number): string {
  return euros.format(cents / 100)
}

/** "6,50" / "6.5" / "6" -> 650, or null when invalid. */
export function parseEuros(input: string): number | null {
  const normalized = input.replace(/\s|€/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Math.round(Number(normalized) * 100)
}
