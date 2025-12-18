import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireKioskBearerAuth } from "@/lib/kiosk-auth"

export const runtime = "nodejs"

type KioskFaceDescriptor = {
  id: string
  descriptor: number[]
}

export async function GET(request: NextRequest) {
  // NOTE: By design (per plan), we do NOT filter by storeId here ("all-stores"),
  // but we still require a valid kiosk token.
  try {
    await requireKioskBearerAuth(request.headers)

    const employees = await prisma.employee.findMany({
      where: {
        consentSignedAt: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        faceDescriptor: true,
        descriptorUpdatedAt: true,
        updatedAt: true,
      },
    })

    const descriptors: KioskFaceDescriptor[] = employees
      .filter((e) => Array.isArray(e.faceDescriptor))
      .map((e) => ({
        id: e.id,
        descriptor: e.faceDescriptor as unknown as number[],
      }))

    // Calculate version: max(descriptorUpdatedAt) or max(updatedAt) for employees with biometrics
    const versionTimestamps = employees
      .filter((e) => Array.isArray(e.faceDescriptor))
      .map((e) => {
        // Prefer descriptorUpdatedAt, fallback to updatedAt
        return e.descriptorUpdatedAt?.getTime() ?? e.updatedAt.getTime()
      })

    const version = versionTimestamps.length > 0
      ? Math.max(...versionTimestamps).toString()
      : "0"

    return NextResponse.json(
      { descriptors, version },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "x-face-descriptors-version": version,
        },
      }
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
    if (status === 500) console.error("Kiosk face-descriptors error:", error)
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    )
  }
}


