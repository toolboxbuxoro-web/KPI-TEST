'use server'

import prisma from "@/lib/db"
import { redis } from "@/lib/redis"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

const STORES_CACHE_KEY = "stores:all"
const CACHE_TTL = 60 * 5 // 5 minutes

export interface StoreData {
  name: string
  address?: string
  login?: string
  password?: string
  allowedIPs?: string[]
  latitude?: number | null
  longitude?: number | null
  radiusMeters?: number
  workStartHour?: number
  workEndHour?: number
  isActive?: boolean
}

export async function createStore(data: StoreData) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  // Hash password if provided
  let passwordHash: string | null = null
  if (data.password && data.password.length > 0) {
    passwordHash = await bcrypt.hash(data.password, 10)
  }

  const store = await prisma.store.create({
    data: {
      name: data.name,
      address: data.address || null,
      login: data.login || null,
      password: passwordHash,
      allowedIPs: data.allowedIPs ?? [],
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      radiusMeters: data.radiusMeters ?? 100,
      workStartHour: data.workStartHour ?? 8,
      workEndHour: data.workEndHour ?? 18,
      isActive: data.isActive ?? true
    }
  })

  // Invalidate cache
  await redis.del(STORES_CACHE_KEY)

  revalidatePath("/admin/stores")
  revalidatePath("/admin/attendance")
  return { success: true, store }
}

export async function updateStore(id: string, data: Partial<StoreData>) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  // Prepare update data
  const updateData: any = { ...data }

  // Hash password if provided and not empty
  if (data.password && data.password.length > 0) {
    updateData.password = await bcrypt.hash(data.password, 10)
  } else {
    // Remove password from update if not provided
    delete updateData.password
  }

  const store = await prisma.store.update({
    where: { id },
    data: updateData
  })

  // Invalidate cache
  await redis.del(STORES_CACHE_KEY)

  revalidatePath("/admin/stores")
  revalidatePath("/admin/attendance")
  return { success: true, store }
}

export async function deleteStore(id: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  // Check if store has attendance records
  const recordsCount = await prisma.attendanceRecord.count({
    where: { storeId: id }
  })

  if (recordsCount > 0) {
    return { 
      error: `Невозможно удалить магазин. Есть ${recordsCount} записей посещаемости.`,
      recordsCount 
    }
  }

  await prisma.store.delete({
    where: { id }
  })

  // Invalidate cache
  await redis.del(STORES_CACHE_KEY)

  revalidatePath("/admin/stores")
  revalidatePath("/admin/attendance")
  return { success: true }
}

export async function getAllStores() {
  // Try cache first
  try {
    const cached = await redis.get(STORES_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached as string)
    }
  } catch (error) {
    console.error("Redis cache error:", error)
  }

  const stores = await prisma.store.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })

  // Cache the result
  try {
    await redis.set(STORES_CACHE_KEY, JSON.stringify(stores), { ex: CACHE_TTL })
  } catch (error) {
    console.error("Redis cache set error:", error)
  }

  return stores
}

export async function getAllStoresIncludingInactive() {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const stores = await prisma.store.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { attendance: true }
      }
    }
  })

  return stores
}

export async function getStoreById(id: string) {
  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      _count: {
        select: { attendance: true }
      }
    }
  })

  return store
}
export async function getStoreName(id: string) {
  const store = await prisma.store.findUnique({
    where: { id },
    select: { name: true }
  })
  return store?.name || null
}
export async function getStoreWithTodayStats(id: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      attendance: {
        where: {
          checkIn: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        include: {
          employee: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { checkIn: 'desc' }
      }
    }
  })

  return store
}

// Get today's stats for all stores (for dashboard)
export async function getStoresTodayStats() {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const stores = await prisma.store.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { attendance: true }
      },
      attendance: {
        where: {
          checkIn: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        select: {
          id: true,
          checkIn: true,
          checkOut: true
        }
      }
    }
  })

  return stores.map(store => ({
    id: store.id,
    name: store.name,
    address: store.address,
    workStartHour: store.workStartHour,
    workEndHour: store.workEndHour,
    totalRecords: store._count.attendance,
    todayCheckIns: store.attendance.length,
    todayActiveSessionsCount: store.attendance.filter(a => !a.checkOut).length
  }))
}
