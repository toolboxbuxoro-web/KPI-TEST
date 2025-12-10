/**
 * Haversine formula to calculate distance between two geo points
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c // Distance in meters
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Check if a point is within a store's geofence
 */
export function isWithinZone(
  userLat: number,
  userLon: number,
  storeLat: number,
  storeLon: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(userLat, userLon, storeLat, storeLon)
  return distance <= radiusMeters
}

/**
 * Find the nearest store to a given location
 */
export function findNearestStore<T extends { latitude: number | null; longitude: number | null; id: string }>(
  userLat: number,
  userLon: number,
  stores: T[]
): { store: T; distance: number } | null {
  let nearestStore: T | null = null
  let minDistance = Infinity

  for (const store of stores) {
    if (store.latitude === null || store.longitude === null) continue
    
    const distance = calculateDistance(userLat, userLon, store.latitude, store.longitude)
    if (distance < minDistance) {
      minDistance = distance
      nearestStore = store
    }
  }

  if (nearestStore === null) return null
  
  return { store: nearestStore, distance: minDistance }
}
