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

/** Free Google Maps link (no API, no key) searching the address. */
export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
