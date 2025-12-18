'use server'

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireSessionUser } from "@/lib/server-auth"

async function assertStoreManagerCanAccessEmployee(employeeId: string, storeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { storeId: true },
  })
  if (!employee) throw new Error("Employee not found")
  if (employee.storeId !== storeId) throw new Error("Forbidden")
}

export async function registerAttendance(employeeId: string, type: 'in' | 'out', storeId?: string, branch: string = "Main Branch") {
  try {
    const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })

    // STORE_MANAGER can only register attendance for their own store & employees.
    if (session.user.role === "STORE_MANAGER") {
      const managerStoreId = session.user.storeId
      if (!managerStoreId) throw new Error("Forbidden")
      if (storeId && storeId !== managerStoreId) throw new Error("Forbidden")
      storeId = managerStoreId
      await assertStoreManagerCanAccessEmployee(employeeId, managerStoreId)
    }

    // Get today's start and end
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    // Find the latest record for today
    const latestRecord = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId,
        checkIn: {
          gte: startOfDay,
          lt: endOfDay
        }
      },
      orderBy: {
        checkIn: 'desc'
      }
    })

    if (type === 'in') {
        if (latestRecord && !latestRecord.checkOut) {
            return { 
                success: false, 
                status: 'ALREADY_CHECKED_IN',
                error: "Вы уже отметились на вход. Сначала нужно выйти." 
            }
        }

        // Validate storeId if provided
        if (storeId) {
            const storeExists = await prisma.store.findUnique({ where: { id: storeId } })
            if (!storeExists) {
                return { error: "Магазин не найден или удален. Пожалуйста, сбросьте настройки терминала." }
            }
        }

        await prisma.attendanceRecord.create({
            data: {
                employeeId,
                storeId: storeId || null,
                checkIn: new Date(),
                branch
            }
        })
        revalidatePath("/admin/attendance")
        revalidatePath("/admin/stores")
        return { success: true, status: 'CHECKED_IN', message: 'Успешный вход' }
    } 
    
    if (type === 'out') {
        if (!latestRecord) {
            return { 
                success: false, 
                status: 'NOT_CHECKED_IN',
                error: "Сначала нужно отметиться на вход." 
            }
        }

        if (latestRecord.checkOut) {
            return { 
                success: false, 
                status: 'ALREADY_CHECKED_OUT',
                error: "Вы уже отметились на выход." 
            }
        }

        await prisma.attendanceRecord.update({
            where: { id: latestRecord.id },
            data: {
                checkOut: new Date()
            }
        })
        revalidatePath("/admin/attendance")
        revalidatePath("/admin/stores")
        return { success: true, status: 'CHECKED_OUT', message: 'Успешный выход' }
    }

    return { error: "Неверный тип операции" }

  } catch (error) {
    console.error("Error registering attendance:", error)
    return { error: "Ошибка при регистрации посещения" }
  }
}

export async function getTodayAttendance(employeeId: string) {
  const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })
  if (session.user.role === "STORE_MANAGER") {
    const managerStoreId = session.user.storeId
    if (!managerStoreId) throw new Error("Forbidden")
    await assertStoreManagerCanAccessEmployee(employeeId, managerStoreId)
  }

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const records = await prisma.attendanceRecord.findMany({
    where: {
      employeeId,
      checkIn: {
        gte: startOfDay,
        lt: endOfDay
      }
    },
    orderBy: {
      checkIn: 'desc'
    }
  })

  return records
}

export async function getAllTodayAttendance(storeId?: string) {
    const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })

    // STORE_MANAGER can only see their store (and cannot request another storeId).
    if (session.user.role === "STORE_MANAGER") {
        const managerStoreId = session.user.storeId
        if (!managerStoreId) throw new Error("Forbidden")
        if (storeId && storeId !== managerStoreId) throw new Error("Forbidden")
        storeId = managerStoreId
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  
    const whereClause: any = {
        checkIn: {
          gte: startOfDay,
          lt: endOfDay
        }
    }

    if (storeId) {
        whereClause.storeId = storeId
    }

    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            imageUrl: true,
            storeId: true,
          },
        },
        store: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        checkIn: 'desc'
      }
    })
  
    return records
}

export async function getEmployeeAttendanceHistory(employeeId: string, month: number, year: number) {
    const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })
    if (session.user.role === "STORE_MANAGER") {
        const managerStoreId = session.user.storeId
        if (!managerStoreId) throw new Error("Forbidden")
        await assertStoreManagerCanAccessEmployee(employeeId, managerStoreId)
    }

    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0, 23, 59, 59)

    const records = await prisma.attendanceRecord.findMany({
        where: {
            employeeId,
            checkIn: {
                gte: startDate,
                lte: endDate
            }
        },
        include: {
            store: {
                select: { id: true, name: true }
            }
        },
        orderBy: {
            checkIn: 'desc'
        }
    })

    return records
}

// Get monthly attendance summary with missing days info
export async function getMonthlyAttendanceSummary(employeeId: string, month: number, year: number) {
    const session = await requireSessionUser({ roles: ["SUPER_ADMIN", "STORE_MANAGER"] })
    if (session.user.role === "STORE_MANAGER") {
        const managerStoreId = session.user.storeId
        if (!managerStoreId) throw new Error("Forbidden")
        await assertStoreManagerCanAccessEmployee(employeeId, managerStoreId)
    }

    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)
    const daysInMonth = endDate.getDate()
    
    const records = await prisma.attendanceRecord.findMany({
        where: {
            employeeId,
            checkIn: {
                gte: startDate,
                lte: new Date(year, month + 1, 0, 23, 59, 59)
            }
        },
        include: {
            store: { select: { id: true, name: true, workStartHour: true, workEndHour: true } }
        },
        orderBy: { checkIn: 'asc' }
    })

    // Group by day
    const dayMap = new Map<number, {
        records: typeof records,
        hasEntry: boolean,
        hasExit: boolean,
        totalWorkMinutes: number
    }>()

    for (let day = 1; day <= daysInMonth; day++) {
        dayMap.set(day, { records: [], hasEntry: false, hasExit: true, totalWorkMinutes: 0 })
    }

    for (const record of records) {
        const day = new Date(record.checkIn).getDate()
        const dayData = dayMap.get(day)!
        dayData.records.push(record)
        dayData.hasEntry = true
        
        if (!record.checkOut) {
            dayData.hasExit = false
        } else {
            // Calculate work time
            const workStart = record.store?.workStartHour ?? 8
            const workEnd = record.store?.workEndHour ?? 18
            
            const checkIn = new Date(record.checkIn)
            const checkOut = new Date(record.checkOut)
            
            const dayStart = new Date(checkIn)
            dayStart.setHours(workStart, 0, 0, 0)
            
            const dayEnd = new Date(checkIn)
            dayEnd.setHours(workEnd, 0, 0, 0)
            
            const effectiveIn = checkIn < dayStart ? dayStart : checkIn
            const effectiveOut = checkOut > dayEnd ? dayEnd : checkOut
            
            if (effectiveIn < effectiveOut) {
                dayData.totalWorkMinutes += (effectiveOut.getTime() - effectiveIn.getTime()) / 60000
            }
        }
    }

    return {
        month,
        year,
        daysInMonth,
        days: Array.from(dayMap.entries()).map(([day, data]) => ({
            day,
            date: new Date(year, month, day),
            hasEntry: data.hasEntry,
            hasExit: data.hasExit || !data.hasEntry, // No entry = no exit expected
            totalWorkMinutes: Math.round(data.totalWorkMinutes),
            records: data.records
        }))
    }
}
