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

// Aggregated attendance statistics
export interface AttendanceStats {
  totalRecords: number
  uniqueEmployees: number
  avgWorkedHours: number
  lateArrivals: number
  lateArrivalRate: number
  totalWorkedHours: number
  recordsWithCheckout: number
}

// Get aggregated statistics for a date range
export async function getAttendanceStats(
  fromDate: Date,
  toDate: Date,
  storeId?: string
): Promise<AttendanceStats> {
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
      store: {
        select: {
          workStartHour: true
        }
      }
    }
  })

  const totalRecords = records.length
  const uniqueEmployees = new Set(records.map(r => r.employeeId)).size
  
  // Calculate worked hours for records with checkout
  const recordsWithCheckout = records.filter(r => r.checkOut !== null)
  let totalWorkedMinutes = 0
  
  recordsWithCheckout.forEach(record => {
    if (record.checkOut) {
      const diffMs = record.checkOut.getTime() - record.checkIn.getTime()
      totalWorkedMinutes += diffMs / (1000 * 60)
    }
  })
  
  const totalWorkedHours = totalWorkedMinutes / 60
  const avgWorkedHours = recordsWithCheckout.length > 0 
    ? totalWorkedHours / recordsWithCheckout.length 
    : 0

  // Calculate late arrivals (check-in after store's work start hour)
  let lateArrivals = 0
  records.forEach(record => {
    const workStart = record.store?.workStartHour ?? 9 // Default 9:00
    const checkInHour = record.checkIn.getHours()
    const checkInMinutes = record.checkIn.getMinutes()
    
    // Late if after work start hour (e.g., 9:15 is late if work starts at 9:00)
    if (checkInHour > workStart || (checkInHour === workStart && checkInMinutes > 15)) {
      lateArrivals++
    }
  })

  const lateArrivalRate = totalRecords > 0 
    ? (lateArrivals / totalRecords) * 100 
    : 0

  return {
    totalRecords,
    uniqueEmployees,
    avgWorkedHours: Math.round(avgWorkedHours * 10) / 10,
    lateArrivals,
    lateArrivalRate: Math.round(lateArrivalRate * 10) / 10,
    totalWorkedHours: Math.round(totalWorkedHours * 10) / 10,
    recordsWithCheckout: recordsWithCheckout.length
  }
}
