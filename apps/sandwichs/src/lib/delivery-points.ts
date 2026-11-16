// Where Bruno delivers. Customers pick one of these instead of typing an address.
// To add a point: append an entry with a new, stable `id` (it is stored on each order).
// Coordinates are used for the Google Maps link in /admin.

export type DeliveryPoint = {
  id: string
  name: string
  address: string
  lat: number
  lon: number
}

export const DELIVERY_POINTS: readonly DeliveryPoint[] = [
  {
    // Crédit Agricole agency "Le Marianne", next to the Intermarché (602 av. du Général de Gaulle).
    // Address and coordinates from the agency page on agences.credit-agricole.fr (agency 5312).
    id: 'ca-saint-laurent-du-var',
    name: 'Crédit Agricole Saint-Laurent-du-Var (à côté d’Intermarché)',
    address: '380 avenue du Général de Gaulle, 06700 Saint-Laurent-du-Var',
    lat: 43.6656259,
    lon: 7.1938446,
  },
]

export function findDeliveryPoint(id: string): DeliveryPoint | undefined {
  return DELIVERY_POINTS.find((p) => p.id === id)
}
