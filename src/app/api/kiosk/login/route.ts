import { NextResponse, type NextRequest } from "next/server"
import { authenticateStore } from "@/app/actions/store-auth"
import { getClientIP } from "@/lib/get-client-ip"
import { issueKioskAccessToken } from "@/lib/kiosk-auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const login = typeof body?.login === "string" ? body.login : ""
    const password = typeof body?.password === "string" ? body.password : ""

    const clientIP = await getClientIP()
    const authResult = await authenticateStore(login, password, clientIP)

    if (!authResult.success || !authResult.storeId) {
      return NextResponse.json(
        {
          error: authResult.error || "Неверный логин или пароль",
          debug: authResult.debug,
        },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      )
    }

    const token = await issueKioskAccessToken({ storeId: authResult.storeId })

    return NextResponse.json(
      {
        accessToken: token.accessToken,
        expiresAt: token.expiresAt,
        expiresIn: token.expiresIn,
        storeId: authResult.storeId,
        storeName: authResult.storeName,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}








