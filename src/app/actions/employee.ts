'use server'

import prisma from "@/lib/db"
import { employeeSchema } from "@/lib/schemas"
import { requireSessionUser } from "@/lib/server-auth"
import { revalidatePath } from "next/cache"

import { utapi } from "@/server/uploadthing"
import { Role } from "@prisma/client"

import bcrypt from "bcryptjs"

// Расширенный интерфейс данных сотрудника
export interface EmployeeCreateData {
  firstName: string
  lastName: string
  middleName?: string
  phone?: string
  email?: string
  login?: string
  password?: string
  birthDate?: string // ISO date
  position: string
  role?: Role
  storeId?: string | null
  isActive?: boolean
  imageUrl?: string
}

export async function createEmployee(data: EmployeeCreateData) {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })

  const validated = employeeSchema.safeParse(data)
  if (!validated.success) {
    return { error: validated.error.flatten() }
  }

  // Хэширование пароля, если предоставлен
  let passwordHash: string | null = null
  if (validated.data.password && validated.data.password.length > 0) {
    passwordHash = await bcrypt.hash(validated.data.password, 10)
  }

  // Подготовка данных для создания
  const createData: any = {
    firstName: validated.data.firstName,
    lastName: validated.data.lastName,
    middleName: validated.data.middleName || null,
    phone: validated.data.phone || null,
    email: validated.data.email || null,
    login: validated.data.login || null,
    password: passwordHash,
    birthDate: validated.data.birthDate ? new Date(validated.data.birthDate) : null,
    position: validated.data.position,
    role: (validated.data.role as Role) || "EMPLOYEE",
    storeId: validated.data.storeId || null,
    isActive: validated.data.isActive ?? true,
    imageUrl: validated.data.imageUrl || null,
  }

  // Store manager can only create employees for their own store and cannot assign privileged roles.
  if (session.user.role === "STORE_MANAGER") {
    if (!session.user.storeId) throw new Error("Forbidden")
    createData.storeId = session.user.storeId
    createData.role = "EMPLOYEE"
  }

  await prisma.employee.create({ data: createData })

  revalidatePath("/admin/employees")
  return { success: true }
}

export async function updateEmployee(id: string, data: Partial<EmployeeCreateData>) {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })

  // STORE_MANAGER can only edit employees from their own store.
  if (session.user.role === "STORE_MANAGER") {
    if (!session.user.storeId) throw new Error("Forbidden")
    const existing = await prisma.employee.findUnique({
      where: { id },
      select: { storeId: true },
    })
    if (!existing) return { error: "Сотрудник не найден" }
    if (existing.storeId !== session.user.storeId) throw new Error("Forbidden")
  }

  const validated = employeeSchema.partial().safeParse(data)
  if (!validated.success) {
    return { error: validated.error.flatten() }
  }

  // Подготовка данных для обновления
  const updateData: any = {}
  
  if (validated.data.firstName !== undefined) updateData.firstName = validated.data.firstName
  if (validated.data.lastName !== undefined) updateData.lastName = validated.data.lastName
  if (validated.data.middleName !== undefined) updateData.middleName = validated.data.middleName || null
  if (validated.data.phone !== undefined) updateData.phone = validated.data.phone || null
  if (validated.data.email !== undefined) updateData.email = validated.data.email || null
  if (validated.data.login !== undefined) updateData.login = validated.data.login || null
  if (validated.data.birthDate !== undefined) updateData.birthDate = validated.data.birthDate ? new Date(validated.data.birthDate) : null
  if (validated.data.position !== undefined) updateData.position = validated.data.position
  if (validated.data.role !== undefined) updateData.role = validated.data.role as Role
  if (validated.data.storeId !== undefined) updateData.storeId = validated.data.storeId || null
  if (validated.data.isActive !== undefined) updateData.isActive = validated.data.isActive
  if (validated.data.imageUrl !== undefined) updateData.imageUrl = validated.data.imageUrl || null

  // Обновление пароля только если он предоставлен и не пустой
  if (validated.data.password && validated.data.password.length > 0) {
    updateData.password = await bcrypt.hash(validated.data.password, 10)
  }

  // Store manager cannot change role/store binding (and should not move employees between stores).
  if (session.user.role === "STORE_MANAGER") {
    delete updateData.role
    delete updateData.storeId
  }

  await prisma.employee.update({
    where: { id },
    data: updateData
  })

  revalidatePath("/admin/employees")
  return { success: true }
}

// Helper function to extract file key from UploadThing URL
// UploadThing URLs are typically: https://utfs.io/f/{fileKey}
// The file key is the part after /f/ in the URL
function extractFileKey(url: string): string | null {
  if (!url || typeof url !== 'string') return null
  
  try {
    // Parse URL to get pathname
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    
    // UploadThing URLs format: /f/{fileKey} or /f/{fileKey}?...
    // Extract the part after /f/
    const match = pathname.match(/\/f\/([^/?]+)/)
    if (match && match[1]) {
      return match[1]
    }
    
    // Fallback: try to get last part of path
    const pathParts = pathname.split('/').filter(Boolean)
    if (pathParts.length > 0) {
      const fIndex = pathParts.indexOf('f')
      if (fIndex >= 0 && fIndex < pathParts.length - 1) {
        return pathParts[fIndex + 1]
      }
      return pathParts[pathParts.length - 1]
    }
    
    return null
  } catch {
    // If URL parsing fails, try regex on the whole URL
    const match = url.match(/\/f\/([^/?]+)/)
    if (match && match[1]) {
      return match[1]
    }
    
    // Last fallback: simple split
    const parts = url.split('/')
    const fIndex = parts.indexOf('f')
    if (fIndex >= 0 && fIndex < parts.length - 1) {
      return parts[fIndex + 1].split('?')[0] // Remove query params if any
    }
    const lastPart = parts[parts.length - 1]
    return lastPart ? lastPart.split('?')[0] : null
  }
}

export async function deleteEmployee(id: string) {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { documents: true }
  })

  if (!employee) {
    return { error: "Сотрудник не найден" }
  }

  // STORE_MANAGER can only delete employees from their own store.
  if (session.user.role === "STORE_MANAGER") {
    if (!session.user.storeId) throw new Error("Forbidden")
    if (employee.storeId !== session.user.storeId) throw new Error("Forbidden")
  }

  try {
    // Delete profile image
    if (employee.imageUrl) {
      const imageKey = extractFileKey(employee.imageUrl)
      if (imageKey) {
        try {
          await utapi.deleteFiles(imageKey)
        } catch (error) {
          // Log but don't fail if image deletion fails
          console.error("Failed to delete profile image:", error)
        }
      }
    }

    // Delete documents
    if (employee.documents.length > 0) {
      const documentKeys = employee.documents
        .map(doc => extractFileKey(doc.url))
        .filter((key): key is string => key !== null)
      
      if (documentKeys.length > 0) {
        try {
          await utapi.deleteFiles(documentKeys)
        } catch (error) {
          // Log but don't fail if document deletion fails
          console.error("Failed to delete documents:", error)
        }
      }
    }

    // Delete employee from database
    await prisma.employee.delete({
      where: { id }
    })

    revalidatePath("/admin/employees")
    return { success: true }
  } catch (error) {
    console.error("Error deleting employee:", error)
    return { error: "Ошибка при удалении сотрудника" }
  }
}

export async function addDocument(employeeId: string, file: { name: string; url: string; size: number; type: string }) {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })

  if (session.user.role === "STORE_MANAGER") {
    if (!session.user.storeId) throw new Error("Forbidden")
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { storeId: true },
    })
    if (!employee) return { error: "Сотрудник не найден" }
    if (employee.storeId !== session.user.storeId) throw new Error("Forbidden")
  }

  await prisma.employeeDocument.create({
    data: {
      employeeId,
      name: file.name,
      url: file.url,
      size: file.size,
      type: file.type
    }
  })

  revalidatePath("/admin/employees")
  return { success: true }
}

export async function deleteDocument(id: string) {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })

  const doc = await prisma.employeeDocument.findUnique({
    where: { id },
    include: { employee: { select: { storeId: true } } },
  })
  if (!doc) {
    return { error: "Документ не найден" }
  }

  if (session.user.role === "STORE_MANAGER") {
    if (!session.user.storeId) throw new Error("Forbidden")
    if (doc.employee.storeId !== session.user.storeId) throw new Error("Forbidden")
  }

  try {
    // Delete file from UploadThing
    const fileKey = extractFileKey(doc.url)
    if (fileKey) {
      try {
        await utapi.deleteFiles(fileKey)
      } catch (error) {
        // Log but don't fail if file deletion fails
        console.error("Failed to delete document file:", error)
      }
    }

    // Delete document from database
    await prisma.employeeDocument.delete({ where: { id } })

    revalidatePath("/admin/employees")
    return { success: true }
  } catch (error) {
    console.error("Error deleting document:", error)
    return { error: "Ошибка при удалении документа" }
  }
}

export async function getEmployee(id: string) {
  try {
    const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        position: true,
        imageUrl: true,
        isActive: true,
        storeId: true,
      },
    })

    if (!employee) return { error: "Сотрудник не найден" }

    if (session.user.role === "STORE_MANAGER") {
      if (!session.user.storeId) throw new Error("Forbidden")
      if (employee.storeId !== session.user.storeId) throw new Error("Forbidden")
    }

    return employee
  } catch (error) {
    console.error("Error fetching employee:", error)
    return { error: "Ошибка при поиске сотрудника" }
  }
}

export async function getAllEmployeesWithPhotos() {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })
  const storeId = session.user.storeId ?? null

  try {
    const employees = await prisma.employee.findMany({
      where: {
        imageUrl: {
          not: null
        },
        ...(session.user.role === "STORE_MANAGER" ? { storeId } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        imageUrl: true,
        storeId: true,
      }
    })
    return { employees }
  } catch (error) {
    console.error("Error fetching employees with photos:", error)
    return { error: "Failed to fetch employees" }
  }
}

/**
 * Toggle employee active status
 * When deactivated, employee will not appear in face recognition
 */
export async function toggleEmployeeActive(employeeId: string) {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { isActive: true, firstName: true, lastName: true, storeId: true }
  })

  if (!employee) {
    return { error: "Сотрудник не найден" }
  }

  if (session.user.role === "STORE_MANAGER") {
    if (!session.user.storeId) throw new Error("Forbidden")
    if (employee.storeId !== session.user.storeId) throw new Error("Forbidden")
  }

  const newStatus = !employee.isActive

  await prisma.employee.update({
    where: { id: employeeId },
    data: { isActive: newStatus }
  })

  // Invalidate face descriptors cache to update recognition
  try {
    const { redis } = await import("@/lib/redis")
    await redis.del("face:descriptors:all")
    if (employee.storeId) {
      await redis.del(`face:descriptors:store:${employee.storeId}`)
    }
  } catch (error) {
    console.error("Redis cache invalidation error:", error)
  }

  revalidatePath("/admin/employees")
  revalidatePath("/admin/attendance")

  return { 
    success: true, 
    isActive: newStatus,
    message: newStatus 
      ? `${employee.firstName} ${employee.lastName} активирован` 
      : `${employee.firstName} ${employee.lastName} деактивирован`
  }
}

