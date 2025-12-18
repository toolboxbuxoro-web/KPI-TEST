import { NextResponse, type NextRequest } from "next/server"
import { requireKioskBearerAuth } from "@/lib/kiosk-auth"

export async function GET(request: NextRequest) {
  try {
    const { storeId } = await requireKioskBearerAuth(request.headers)
    return NextResponse.json(
      { storeId },
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






