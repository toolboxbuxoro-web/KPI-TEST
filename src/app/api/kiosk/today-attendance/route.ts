import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireKioskBearerAuth } from "@/lib/kiosk-auth"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { storeId: tokenStoreId } = await requireKioskBearerAuth(request.headers)

    // Get storeId from query param if provided, otherwise use token's storeId
    const searchParams = request.nextUrl.searchParams
    const queryStoreId = searchParams.get("storeId")

    // Use query param if provided, otherwise fall back to token's storeId
    const storeId = queryStoreId || tokenStoreId

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const whereClause: {
      checkIn: { gte: Date; lt: Date }
      storeId?: string
    } = {
      checkIn: {
        gte: startOfDay,
        lt: endOfDay,
      },
    }

    // Filter by storeId if provided
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
        checkIn: "desc",
      },
    })

    return NextResponse.json(records, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    })
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
    if (status === 500) console.error("Kiosk today-attendance error:", error)
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    )
  }
}






