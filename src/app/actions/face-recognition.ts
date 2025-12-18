'use server'

import prisma from "@/lib/db"
import { redis } from "@/lib/redis"
import { requireSessionUser } from "@/lib/server-auth"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

const DESCRIPTORS_CACHE_ALL_KEY = "face:descriptors:all"
const DESCRIPTORS_CACHE_STORE_PREFIX = "face:descriptors:store:"
const CACHE_TTL = 60 * 5 // 5 minutes

function getDescriptorsCacheKey(scope: "all" | "store", storeId?: string | null) {
  if (scope === "all") return DESCRIPTORS_CACHE_ALL_KEY
  if (!storeId) throw new Error("Forbidden")
  return `${DESCRIPTORS_CACHE_STORE_PREFIX}${storeId}`
}

async function assertCanManageEmployee(
  employeeId: string,
  session: Awaited<ReturnType<typeof requireSessionUser>>
): Promise<string | null> {
  const role = session.user.role
  if (role === "SUPER_ADMIN") {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { storeId: true },
    })
    if (!employee) throw new Error("Employee not found")
    return employee.storeId
  }

  if (role === "STORE_MANAGER") {
    const managerStoreId = session.user.storeId
    if (!managerStoreId) throw new Error("Forbidden")

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { storeId: true },
    })
    if (!employee) throw new Error("Employee not found")
    if (employee.storeId !== managerStoreId) throw new Error("Forbidden")
    return employee.storeId
  }

  throw new Error("Forbidden")
}

async function invalidateDescriptorCacheForStore(storeId: string | null) {
  try {
    await redis.del(DESCRIPTORS_CACHE_ALL_KEY)
    if (storeId) {
      await redis.del(getDescriptorsCacheKey("store", storeId))
    }
  } catch (error) {
    console.error("Redis cache invalidation error:", error)
  }
}

export interface FaceDescriptorData {
  id: string
  firstName: string
  lastName: string
  descriptor: number[]
}

/**
 * Get all face descriptors from cache or database
 * Used by attendance scanner for fast initialization
 */
export async function getAllFaceDescriptors(): Promise<FaceDescriptorData[]> {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })
  const scope: "all" | "store" = session.user.role === "STORE_MANAGER" ? "store" : "all"
  const storeId = session.user.storeId ?? null
  const cacheKey = getDescriptorsCacheKey(scope, storeId)

  // Try cache first
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached as string)
    }
  } catch (error) {
    console.error("Redis cache error:", error)
  }

  // Fetch from database - get all ACTIVE employees with photos and consent
  const employees = await prisma.employee.findMany({
    where: {
      consentSignedAt: { not: null },
      isActive: true,
      ...(scope === "store" ? { storeId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      faceDescriptor: true
    }
  })

  // Filter employees with face descriptors
  const descriptors: FaceDescriptorData[] = employees
    .filter(e => e.faceDescriptor !== null)
    .map(e => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      descriptor: e.faceDescriptor as number[]
    }))

  // Cache the result
  try {
    await redis.set(cacheKey, JSON.stringify(descriptors), { ex: CACHE_TTL })
  } catch (error) {
    console.error("Redis cache set error:", error)
  }

  return descriptors
}

/**
 * Save face descriptor for an employee
 * Called after generating descriptor from photo
 */
export async function saveFaceDescriptor(employeeId: string, descriptor: number[]) {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })
  const employeeStoreId = await assertCanManageEmployee(employeeId, session)

  if (!Array.isArray(descriptor) || descriptor.length !== 128) {
    return { error: "Invalid descriptor format. Expected 128 float values." }
  }

  // Save descriptor and sign consent atomically:
  // - consent is only signed if descriptor save succeeds
  // - consent timestamp is only set if it was previously null
  await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: employeeId },
      data: {
        faceDescriptor: descriptor as unknown as Prisma.InputJsonValue,
        descriptorUpdatedAt: new Date()
      }
    })

    await tx.employee.updateMany({
      where: { id: employeeId, consentSignedAt: null },
      data: { consentSignedAt: new Date() }
    })
  })

  // Invalidate cache
  await invalidateDescriptorCacheForStore(employeeStoreId)

  revalidatePath("/admin/employees")
  revalidatePath("/admin/attendance")
  
  return { success: true }
}

/**
 * Clear face descriptor for an employee
 */
export async function clearFaceDescriptor(employeeId: string) {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })
  const employeeStoreId = await assertCanManageEmployee(employeeId, session)

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      faceDescriptor: Prisma.JsonNull,
      descriptorUpdatedAt: null
    }
  })

  // Invalidate cache
  await invalidateDescriptorCacheForStore(employeeStoreId)

  revalidatePath("/admin/employees")
  revalidatePath("/admin/attendance")
  
  return { success: true }
}

/**
 * Sign biometric consent for GDPR compliance
 */
export async function signBiometricConsent(employeeId: string) {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })
  const employeeStoreId = await assertCanManageEmployee(employeeId, session)

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      consentSignedAt: new Date()
    }
  })

  // Invalidate cache (consent affects who is included in recognition list)
  await invalidateDescriptorCacheForStore(employeeStoreId)

  revalidatePath("/admin/employees")
  revalidatePath("/admin/attendance")
  
  return { success: true }
}

/**
 * Revoke biometric consent - also clears face descriptor
 */
export async function revokeBiometricConsent(employeeId: string) {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })
  const employeeStoreId = await assertCanManageEmployee(employeeId, session)

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      consentSignedAt: null,
      faceDescriptor: Prisma.JsonNull,
      descriptorUpdatedAt: null
    }
  })

  // Invalidate cache
  await invalidateDescriptorCacheForStore(employeeStoreId)

  revalidatePath("/admin/employees")
  revalidatePath("/admin/attendance")
  
  return { success: true }
}

/**
 * Get employees without face descriptors (for admin dashboard)
 */
export async function getEmployeesWithoutDescriptors() {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })
  const scope: "all" | "store" = session.user.role === "STORE_MANAGER" ? "store" : "all"
  const storeId = session.user.storeId ?? null
  if (scope === "store" && !storeId) return { error: "Forbidden" }

  // Get all employees with photos, filter in JS
  const employees = await prisma.employee.findMany({
    where: {
      imageUrl: { not: null },
      ...(scope === "store" ? { storeId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
      imageUrl: true,
      consentSignedAt: true,
      faceDescriptor: true
    }
  })

  // Filter those without descriptor or consent
  const filtered = employees.filter(e => 
    e.faceDescriptor === null || e.consentSignedAt === null
  )

  return { employees: filtered }
}

/**
 * Get biometric stats for dashboard
 */
export async function getBiometricStats() {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })
  const scope: "all" | "store" = session.user.role === "STORE_MANAGER" ? "store" : "all"
  const storeId = session.user.storeId ?? null
  if (scope === "store" && !storeId) return { error: "Forbidden" }

  // Get all employees and count in JS (Prisma Json field limitation)
  const employees = await prisma.employee.findMany({
    where: {
      ...(scope === "store" ? { storeId } : {}),
    },
    select: {
      faceDescriptor: true,
      consentSignedAt: true,
      imageUrl: true
    }
  })

  const totalEmployees = employees.length
  const withDescriptor = employees.filter(e => e.faceDescriptor !== null).length
  const withConsent = employees.filter(e => e.consentSignedAt !== null).length
  const withPhoto = employees.filter(e => e.imageUrl !== null).length

  return {
    totalEmployees,
    withDescriptor,
    withConsent,
    withPhoto,
    readyForRecognition: withDescriptor
  }
}
