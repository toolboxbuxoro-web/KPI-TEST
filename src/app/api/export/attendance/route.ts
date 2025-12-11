import { auth } from "@/auth"
import prisma from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")
    const employeeId = searchParams.get("employeeId")
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    // Build filter conditions
    const where: {
      storeId?: string
      employeeId?: string
      checkIn?: { gte?: Date; lte?: Date }
    } = {}

    if (storeId) {
      where.storeId = storeId
    }

    if (employeeId) {
      where.employeeId = employeeId
    }

    // Date range filter
    if (startDateParam || endDateParam) {
      where.checkIn = {}
      if (startDateParam) {
        where.checkIn.gte = new Date(startDateParam)
      }
      if (endDateParam) {
        // End of day
        const endDate = new Date(endDateParam)
        endDate.setHours(23, 59, 59, 999)
        where.checkIn.lte = endDate
      }
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        store: {
          select: {
            name: true,
            workStartHour: true,
          },
        },
      },
      orderBy: {
        checkIn: "desc",
      },
    })

    // CSV headers
    const headers = [
      "Дата",
      "Сотрудник (ФИО)",
      "Магазин",
      "Время входа",
      "Время выхода",
      "Отработано часов",
      "В зоне",
      "Статус", // New: late status
    ]

    // Format helpers
    const formatDate = (date: Date) => {
      return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    }

    const formatTime = (date: Date | null) => {
      if (!date) return ""
      return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      })
    }

    const calculateHours = (checkIn: Date, checkOut: Date | null) => {
      if (!checkOut) return ""
      const diffMs = checkOut.getTime() - checkIn.getTime()
      const hours = diffMs / (1000 * 60 * 60)
      return hours.toFixed(2).replace(".", ",")
    }

    // Build rows with late status
    let totalHours = 0
    let lateCount = 0
    const rows = records.map((record) => {
      const workStart = record.store?.workStartHour ?? 9
      const checkInHour = record.checkIn.getHours()
      const checkInMinutes = record.checkIn.getMinutes()
      
      // Late if after work start + 15 min grace
      const isLate = checkInHour > workStart || (checkInHour === workStart && checkInMinutes > 15)
      if (isLate) lateCount++
      
      // Sum hours
      if (record.checkOut) {
        const diffMs = record.checkOut.getTime() - record.checkIn.getTime()
        totalHours += diffMs / (1000 * 60 * 60)
      }
      
      return [
        formatDate(record.checkIn),
        `${record.employee.firstName} ${record.employee.lastName}`,
        record.store?.name || "—",
        formatTime(record.checkIn),
        formatTime(record.checkOut),
        calculateHours(record.checkIn, record.checkOut),
        record.inZone ? "да" : "нет",
        isLate ? "опоздание" : "вовремя",
      ]
    })

    // Add summary row
    const summaryRow = [
      "ИТОГО",
      `Записей: ${records.length}`,
      "",
      "",
      "",
      totalHours.toFixed(2).replace(".", ","),
      "",
      `Опозданий: ${lateCount}`,
    ]

    // Generate CSV with semicolon delimiter for Excel
    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.join(";")),
      "", // Empty row before summary
      summaryRow.join(";"),
    ].join("\n")

    // Add BOM for Excel UTF-8 compatibility
    const finalContent = "\uFEFF" + csvContent

    // Filename with current date
    const today = new Date().toISOString().split("T")[0]

    return new NextResponse(finalContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance_${today}.csv"`,
      },
    })
  } catch (error) {
    console.error(
      "Attendance export error:",
      error instanceof Error ? error.message : String(error)
    )
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
