import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { isWithinZone, findNearestStore } from "@/lib/geo"

interface CheckRequest {
  employee_code: string
  type: "in" | "out"
  timestamp?: string
  geo?: { lat: number; lng: number }
  device?: string
  photo_base64?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckRequest = await request.json()
    
    // Validate required fields
    if (!body.employee_code || !body.type) {
      return NextResponse.json(
        { error: "employee_code and type are required" },
        { status: 400 }
      )
    }

    if (!["in", "out"].includes(body.type)) {
      return NextResponse.json(
        { error: "type must be 'in' or 'out'" },
        { status: 400 }
      )
    }

    // Find employee by code
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { employeeCode: body.employee_code },
          { id: body.employee_code }
        ]
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      )
    }

    // Get all active stores with geo coordinates
    const stores = await prisma.store.findMany({
      where: { isActive: true }
    })

    // Determine store and in_zone status
    let storeId: string | null = null
    let inZone = true
    let storeName = null

    if (body.geo && stores.length > 0) {
      const storesWithGeo = stores.filter(s => s.latitude !== null && s.longitude !== null) as Array<{
        id: string
        name: string
        latitude: number
        longitude: number
        radiusMeters: number
      }>

      if (storesWithGeo.length > 0) {
        const nearest = findNearestStore(body.geo.lat, body.geo.lng, storesWithGeo)
        
        if (nearest) {
          storeId = nearest.store.id
          storeName = nearest.store.name
          inZone = isWithinZone(
            body.geo.lat,
            body.geo.lng,
            nearest.store.latitude,
            nearest.store.longitude,
            nearest.store.radiusMeters
          )
        }
      }
    }

    // Handle photo upload if provided
    let photoUrl: string | null = null
    if (body.photo_base64) {
      // TODO: Upload to UploadThing and get URL
      // For now, we'll skip photo storage
    }

    const now = body.timestamp ? new Date(body.timestamp) : new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    if (body.type === "in") {
      // Check-in: Create new record
      const existingCheckIn = await prisma.attendanceRecord.findFirst({
        where: {
          employeeId: employee.id,
          checkIn: { gte: today, lt: tomorrow },
          checkOut: null
        }
      })

      if (existingCheckIn) {
        return NextResponse.json(
          { error: "Already checked in today", record_id: existingCheckIn.id },
          { status: 409 }
        )
      }

      const record = await prisma.attendanceRecord.create({
        data: {
          employeeId: employee.id,
          storeId,
          checkIn: now,
          latitude: body.geo?.lat,
          longitude: body.geo?.lng,
          inZone,
          device: body.device,
          photoUrl
        }
      })

      return NextResponse.json({
        success: true,
        record_id: record.id,
        type: "in",
        in_zone: inZone,
        store: storeName,
        timestamp: now.toISOString()
      })

    } else {
      // Check-out: Find and update existing record
      const existingRecord = await prisma.attendanceRecord.findFirst({
        where: {
          employeeId: employee.id,
          checkIn: { gte: today, lt: tomorrow },
          checkOut: null
        }
      })

      if (!existingRecord) {
        return NextResponse.json(
          { error: "No check-in found for today" },
          { status: 404 }
        )
      }

      const record = await prisma.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: {
          checkOut: now
        }
      })

      return NextResponse.json({
        success: true,
        record_id: record.id,
        type: "out",
        in_zone: inZone,
        store: storeName,
        timestamp: now.toISOString()
      })
    }

  } catch (error) {
    console.error("Attendance check error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET: Check current status for an employee
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeCode = searchParams.get("employee_code")

    if (!employeeCode) {
      return NextResponse.json(
        { error: "employee_code is required" },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { employeeCode: employeeCode },
          { id: employeeCode }
        ]
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    const todayRecord = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId: employee.id,
        checkIn: { gte: today, lt: tomorrow }
      },
      include: { store: true },
      orderBy: { checkIn: "desc" }
    })

    return NextResponse.json({
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName
      },
      today: todayRecord ? {
        checked_in: true,
        checked_out: !!todayRecord.checkOut,
        check_in_time: todayRecord.checkIn,
        check_out_time: todayRecord.checkOut,
        store: todayRecord.store?.name,
        in_zone: todayRecord.inZone
      } : {
        checked_in: false,
        checked_out: false
      }
    })

  } catch (error) {
    console.error("Attendance status error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
