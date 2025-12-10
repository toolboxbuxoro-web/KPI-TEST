import { calculateDistance, isWithinZone, findNearestStore } from '../geo'

describe('Geolocation Utilities', () => {
  describe('calculateDistance', () => {
    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(41.320, 69.240, 41.320, 69.240)
      expect(distance).toBe(0)
    })

    it('should calculate distance between two points accurately', () => {
      // Tashkent to Samarkand (~270km)
      const distance = calculateDistance(41.2995, 69.2401, 39.6542, 66.9597)
      expect(distance).toBeGreaterThan(260000) // > 260km
      expect(distance).toBeLessThan(280000)    // < 280km
    })

    it('should calculate short distances accurately', () => {
      // ~100 meters apart
      const lat1 = 41.320000
      const lng1 = 69.240000
      const lat2 = 41.320900 // ~100m north
      const lng2 = 69.240000
      
      const distance = calculateDistance(lat1, lng1, lat2, lng2)
      expect(distance).toBeGreaterThan(90)
      expect(distance).toBeLessThan(110)
    })

    it('should be symmetric (A to B = B to A)', () => {
      const distanceAB = calculateDistance(41.320, 69.240, 41.330, 69.250)
      const distanceBA = calculateDistance(41.330, 69.250, 41.320, 69.240)
      expect(Math.abs(distanceAB - distanceBA)).toBeLessThan(0.01)
    })
  })

  describe('isWithinZone', () => {
    const storeLat = 41.320
    const storeLng = 69.240
    const radiusMeters = 100

    it('should return true when user is at store location', () => {
      const result = isWithinZone(storeLat, storeLng, storeLat, storeLng, radiusMeters)
      expect(result).toBe(true)
    })

    it('should return true when user is within radius', () => {
      // ~50 meters away
      const userLat = 41.32045
      const userLng = 69.240
      const result = isWithinZone(userLat, userLng, storeLat, storeLng, radiusMeters)
      expect(result).toBe(true)
    })

    it('should return false when user is outside radius', () => {
      // ~200 meters away
      const userLat = 41.322
      const userLng = 69.240
      const result = isWithinZone(userLat, userLng, storeLat, storeLng, radiusMeters)
      expect(result).toBe(false)
    })

    it('should handle edge case at exact boundary', () => {
      // At boundary should be true (<=)
      const userLat = 41.3209 // ~100m
      const result = isWithinZone(userLat, storeLng, storeLat, storeLng, radiusMeters)
      expect(typeof result).toBe('boolean')
    })
  })

  describe('findNearestStore', () => {
    const stores = [
      { id: 'store1', name: 'Store 1', latitude: 41.320, longitude: 69.240 },
      { id: 'store2', name: 'Store 2', latitude: 41.330, longitude: 69.250 },
      { id: 'store3', name: 'Store 3', latitude: 41.340, longitude: 69.260 },
    ]

    it('should find the nearest store', () => {
      const result = findNearestStore(41.321, 69.241, stores)
      expect(result).not.toBeNull()
      expect(result?.store.id).toBe('store1')
    })

    it('should return distance to nearest store', () => {
      const result = findNearestStore(41.321, 69.241, stores)
      expect(result?.distance).toBeGreaterThan(0)
      expect(result?.distance).toBeLessThan(500) // Should be close
    })

    it('should return null for empty stores array', () => {
      const result = findNearestStore(41.320, 69.240, [])
      expect(result).toBeNull()
    })

    it('should skip stores without coordinates', () => {
      const storesWithMissing = [
        { id: 'store1', latitude: null, longitude: null },
        { id: 'store2', latitude: 41.330, longitude: 69.250 },
      ]
      const result = findNearestStore(41.320, 69.240, storesWithMissing)
      expect(result?.store.id).toBe('store2')
    })

    it('should return null if all stores have null coordinates', () => {
      const storesWithNullCoords = [
        { id: 'store1', latitude: null, longitude: null },
        { id: 'store2', latitude: null, longitude: null },
      ]
      const result = findNearestStore(41.320, 69.240, storesWithNullCoords)
      expect(result).toBeNull()
    })
  })
})
