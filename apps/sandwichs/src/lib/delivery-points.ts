// Where Bruno delivers. Customers pick one of these instead of typing an address. The points live
// in the database (table delivery_points) and Bruno edits them in /admin/livraison.

export type DeliveryPoint = {
  id: string
  name: string
  address: string
}

/** Stable id for a new point, from its name: "Mairie de Valbonne" → "mairie-de-valbonne". */
export function deliveryPointSlug(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'point'
  )
}

/** Free Google Maps link (no API, no key): the one Bruno pasted, else a search of the address. */
export function mapsUrl(address: string, pasted?: string): string {
  return pasted || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

/** Accepts only http(s) links for the pasted Maps URL; '' clears it. */
export function cleanMapsUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}
