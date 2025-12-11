'use server'

import prisma from "@/lib/db"
import { employeeSchema } from "@/lib/schemas"
import { auth } from "@/auth"
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
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

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

  await prisma.employee.create({ data: createData })

  revalidatePath("/admin/employees")
  return { success: true }
}

export async function updateEmployee(id: string, data: Partial<EmployeeCreateData>) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

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
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { documents: true }
  })

  if (!employee) {
    return { error: "Сотрудник не найден" }
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
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

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
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const doc = await prisma.employeeDocument.findUnique({ where: { id } })
  if (!doc) {
    return { error: "Документ не найден" }
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
  // Allow public access for scanner kiosk mode
  // const session = await auth()
  // if (!session?.user) throw new Error("Unauthorized")

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { documents: true }
    })
    return employee
  } catch (error) {
    console.error("Error fetching employee:", error)
    return { error: "Ошибка при поиске сотрудника" }
  }
}

export async function getAllEmployeesWithPhotos() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized" }

  try {
    const employees = await prisma.employee.findMany({
      where: {
        imageUrl: {
          not: null
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        imageUrl: true
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
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { isActive: true, firstName: true, lastName: true }
  })

  if (!employee) {
    return { error: "Сотрудник не найден" }
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

