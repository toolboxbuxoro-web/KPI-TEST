'use server'

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export interface AttendanceRecordWithEmployee {
  id: string
  employeeId: string
  storeId: string | null
  checkIn: Date
  checkOut: Date | null
  inZone: boolean
  device: string | null
  createdAt: Date
  updatedAt: Date
  employee: {
    id: string
    firstName: string
    lastName: string
    position: string
    imageUrl: string | null
  }
  store: {
    id: string
    name: string
  } | null
}

export interface AttendanceUpdateData {
  checkIn?: Date
  checkOut?: Date | null
  inZone?: boolean
}

// Get attendance records with filters (date range)
export async function getAttendanceRecords(
  fromDate: Date,
  toDate: Date,
  storeId?: string
): Promise<AttendanceRecordWithEmployee[]> {
  const startOfRange = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
  const endOfRange = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1)

  const records = await prisma.attendanceRecord.findMany({
    where: {
      checkIn: {
        gte: startOfRange,
        lt: endOfRange
      },
      ...(storeId && { storeId })
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          imageUrl: true
        }
      },
      store: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      checkIn: 'desc'
    }
  })

  return records
}

// Update attendance record with audit log
export async function updateAttendanceRecord(
  recordId: string,
  data: AttendanceUpdateData
) {
  try {
    const session = await auth()
    const userId = session?.user?.email || 'system'

    // Get current record state
    const currentRecord = await prisma.attendanceRecord.findUnique({
      where: { id: recordId }
    })

    if (!currentRecord) {
      return { error: "Запись не найдена" }
    }

    // Prepare update data
    const updateData: any = {}
    if (data.checkIn !== undefined) {
      updateData.checkIn = data.checkIn
    }
    if (data.checkOut !== undefined) {
      updateData.checkOut = data.checkOut
    }
    if (data.inZone !== undefined) {
      updateData.inZone = data.inZone
    }

    // Update record
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: updateData
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'AttendanceRecord',
        recordId,
        previousValue: {
          checkIn: currentRecord.checkIn.toISOString(),
          checkOut: currentRecord.checkOut?.toISOString() || null,
          inZone: currentRecord.inZone
        },
        newValue: {
          checkIn: updatedRecord.checkIn.toISOString(),
          checkOut: updatedRecord.checkOut?.toISOString() || null,
          inZone: updatedRecord.inZone
        },
        details: `Attendance record updated by ${userId}`
      }
    })

    revalidatePath("/admin/attendance")
    return { success: true, record: updatedRecord }

  } catch (error) {
    console.error("Error updating attendance record:", error)
    return { error: "Ошибка при обновлении записи" }
  }
}

// Get audit logs for a specific record
export async function getRecordAuditLogs(recordId: string) {
  const logs = await prisma.auditLog.findMany({
    where: {
      recordId,
      entity: 'AttendanceRecord'
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return logs
}

// Get all stores for filter dropdown
export async function getStoresForFilter() {
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  })

  return stores
}
