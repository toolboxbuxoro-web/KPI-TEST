'use server'

import prisma from "@/lib/db"
import { redis } from "@/lib/redis"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

const DESCRIPTORS_CACHE_KEY = "face:descriptors:all"
const CACHE_TTL = 60 * 5 // 5 minutes

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
  // Try cache first
  try {
    const cached = await redis.get(DESCRIPTORS_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached as string)
    }
  } catch (error) {
    console.error("Redis cache error:", error)
  }

  // Fetch from database
  const employees = await prisma.employee.findMany({
    where: {
      faceDescriptor: { not: null },
      consentSignedAt: { not: null } // Only employees who gave consent
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      faceDescriptor: true
    }
  })

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
    await redis.set(DESCRIPTORS_CACHE_KEY, JSON.stringify(descriptors), { ex: CACHE_TTL })
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
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  if (!Array.isArray(descriptor) || descriptor.length !== 128) {
    return { error: "Invalid descriptor format. Expected 128 float values." }
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      faceDescriptor: descriptor,
      descriptorUpdatedAt: new Date()
    }
  })

  // Invalidate cache
  try {
    await redis.del(DESCRIPTORS_CACHE_KEY)
  } catch (error) {
    console.error("Redis cache invalidation error:", error)
  }

  revalidatePath("/admin/employees")
  revalidatePath("/admin/attendance")
  
  return { success: true }
}

/**
 * Clear face descriptor for an employee
 */
export async function clearFaceDescriptor(employeeId: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      faceDescriptor: null,
      descriptorUpdatedAt: null
    }
  })

  // Invalidate cache
  try {
    await redis.del(DESCRIPTORS_CACHE_KEY)
  } catch (error) {
    console.error("Redis cache invalidation error:", error)
  }

  revalidatePath("/admin/employees")
  revalidatePath("/admin/attendance")
  
  return { success: true }
}

/**
 * Sign biometric consent for GDPR compliance
 */
export async function signBiometricConsent(employeeId: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      consentSignedAt: new Date()
    }
  })

  revalidatePath("/admin/employees")
  
  return { success: true }
}

/**
 * Revoke biometric consent - also clears face descriptor
 */
export async function revokeBiometricConsent(employeeId: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      consentSignedAt: null,
      faceDescriptor: null,
      descriptorUpdatedAt: null
    }
  })

  // Invalidate cache
  try {
    await redis.del(DESCRIPTORS_CACHE_KEY)
  } catch (error) {
    console.error("Redis cache invalidation error:", error)
  }

  revalidatePath("/admin/employees")
  revalidatePath("/admin/attendance")
  
  return { success: true }
}

/**
 * Get employees without face descriptors (for admin dashboard)
 */
export async function getEmployeesWithoutDescriptors() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized" }

  const employees = await prisma.employee.findMany({
    where: {
      OR: [
        { faceDescriptor: null },
        { consentSignedAt: null }
      ],
      imageUrl: { not: null }
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

  return { employees }
}

/**
 * Get biometric stats for dashboard
 */
export async function getBiometricStats() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized" }

  const [totalEmployees, withDescriptor, withConsent, withPhoto] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { faceDescriptor: { not: null } } }),
    prisma.employee.count({ where: { consentSignedAt: { not: null } } }),
    prisma.employee.count({ where: { imageUrl: { not: null } } })
  ])

  return {
    totalEmployees,
    withDescriptor,
    withConsent,
    withPhoto,
    readyForRecognition: withDescriptor // Both descriptor and consent
  }
}
