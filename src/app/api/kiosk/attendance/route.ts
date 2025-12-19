import { NextResponse, type NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireKioskBearerAuth } from "@/lib/kiosk-auth"

export const runtime = "nodejs"

type AttendanceType = "in" | "out"

function jsonNoStore(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { storeId } = await requireKioskBearerAuth(request.headers)

    const body = await request.json().catch(() => ({} as unknown))
    const employeeId = typeof (body as any)?.employeeId === "string" ? (body as any).employeeId : ""
    const type = (body as any)?.type as AttendanceType

    if (!employeeId) return jsonNoStore({ error: "Missing employeeId" }, 400)
    if (type !== "in" && type !== "out") return jsonNoStore({ error: "Invalid type" }, 400)

    // Validate store still exists & active (token could outlive deletion/deactivation)
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, isActive: true },
    })
    if (!store || !store.isActive) return jsonNoStore({ error: "Store is not active" }, 403)

    // Validate employee exists & active
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, isActive: true },
    })
    if (!employee || !employee.isActive) return jsonNoStore({ error: "Employee not found" }, 404)

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const latestRecord = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId,
        checkIn: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { checkIn: "desc" },
      select: { id: true, checkOut: true },
    })

    if (type === "in") {
      if (latestRecord && !latestRecord.checkOut) {
        return jsonNoStore(
          {
            success: false,
            status: "ALREADY_CHECKED_IN",
            error: "Вы уже отметились на вход. Сначала нужно выйти.",
          },
          409
        )
      }

      await prisma.attendanceRecord.create({
        data: {
          employeeId,
          storeId,
          checkIn: now,
          device: "kiosk",
        },
      })

      return jsonNoStore(
        { success: true, status: "CHECKED_IN", message: "Успешный вход" },
        200
      )
    }

    // type === "out"
    if (!latestRecord) {
      return jsonNoStore(
        {
          success: false,
          status: "NOT_CHECKED_IN",
          error: "Сначала нужно отметиться на вход.",
        },
        409
      )
    }

    if (latestRecord.checkOut) {
      return jsonNoStore(
        {
          success: false,
          status: "ALREADY_CHECKED_OUT",
          error: "Вы уже отметились на выход.",
        },
        409
      )
    }

    await prisma.attendanceRecord.update({
      where: { id: latestRecord.id },
      data: { checkOut: now },
    })

    return jsonNoStore(
      { success: true, status: "CHECKED_OUT", message: "Успешный выход" },
      200
    )
  } catch (error) {
    const status =
      typeof error === "object" &&
      error &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number"
        ? (error as { status: number }).status
        : 500
    const message =
      status === 500
        ? "Internal Server Error"
        : error instanceof Error
          ? error.message
          : "Unauthorized"
    if (status === 500) console.error("Kiosk attendance error:", error)
    return jsonNoStore({ error: message }, status)
  }
}








