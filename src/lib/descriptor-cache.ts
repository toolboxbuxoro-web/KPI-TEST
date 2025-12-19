/**
 * IndexedDB cache for face descriptors
 * Provides fast local storage and retrieval of face descriptors with versioning support
 */

const DB_NAME = 'toolbox-face-descriptors'
const DB_VERSION = 1
const STORE_NAME = 'descriptors'

interface CachedDescriptors {
  descriptors: Array<{ id: string; descriptor: number[] }>
  version: string
  cachedAt: number
}

/**
 * Open IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

/**
 * Get cached descriptors from IndexedDB
 * Returns null if cache doesn't exist or is invalid
 */
export async function getCachedDescriptors(): Promise<CachedDescriptors | null> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get('current')

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result as CachedDescriptors | undefined
        resolve(result || null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('Failed to read descriptor cache:', error)
    return null
  }
}

/**
 * Save descriptors to IndexedDB cache
 */
export async function setCachedDescriptors(
  descriptors: Array<{ id: string; descriptor: number[] }>,
  version: string
): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const cacheData: CachedDescriptors = {
      descriptors,
      version,
      cachedAt: Date.now(),
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.put({ id: 'current', ...cacheData })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('Failed to save descriptor cache:', error)
    // Don't throw - cache failures shouldn't break the app
  }
}

/**
 * Clear the descriptor cache
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await new Promise<void>((resolve, reject) => {
      const request = store.delete('current')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('Failed to clear descriptor cache:', error)
  }
}






