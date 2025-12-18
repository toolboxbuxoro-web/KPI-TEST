import { NextResponse, type NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireKioskBearerAuth } from "@/lib/kiosk-auth"

export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireKioskBearerAuth(request.headers)

    const { id } = await context.params
    if (!id) {
      return NextResponse.json(
        { error: "Missing employee id" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      )
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        imageUrl: true,
        isActive: true,
      },
    })

    if (!employee || !employee.isActive) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      )
    }

    return NextResponse.json(
      {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position,
        imageUrl: employee.imageUrl,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    const status =
      typeof error === "object" &&
      error &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number"
        ? (error as { status: number }).status
        : 401
    const message = error instanceof Error ? error.message : "Unauthorized"
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    )
  }
}






