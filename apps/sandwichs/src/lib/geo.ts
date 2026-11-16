/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export type Zone = { zoneCenterLat: number; zoneCenterLon: number; zoneRadiusKm: number }

export function isInZone(point: { lat: number; lon: number }, zone: Zone): boolean {
  return distanceKm(point, { lat: zone.zoneCenterLat, lon: zone.zoneCenterLon }) <= zone.zoneRadiusKm
}
