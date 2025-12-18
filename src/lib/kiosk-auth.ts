import { SignJWT, jwtVerify } from "jose"

export const KIOSK_JWT_ISSUER = "toolbox-control"
export const KIOSK_JWT_AUDIENCE = "kiosk"

export type KioskAccessTokenClaims = {
  storeId: string
}

export class KioskAuthError extends Error {
  status: number

  constructor(message: string, status = 401) {
    super(message)
    this.name = "KioskAuthError"
    this.status = status
  }
}

function getKioskJwtSecret(): string {
  const secret =
    process.env.KIOSK_JWT_SECRET ||
    process.env.KIOSK_TOKEN_SECRET ||
    process.env.NEXTAUTH_SECRET

  if (!secret) {
    throw new KioskAuthError(
      "Kiosk token secret is not configured (set KIOSK_JWT_SECRET).",
      500
    )
  }

  return secret
}

function getKioskJwtKey(): Uint8Array {
  const secret = getKioskJwtSecret()
  return new TextEncoder().encode(secret)
}

function getDefaultTtlSeconds(): number {
  const raw =
    process.env.KIOSK_ACCESS_TOKEN_TTL_SECONDS ||
    process.env.KIOSK_JWT_TTL_SECONDS ||
    ""
  const parsed = Number(raw)
  if (!raw) return 60 * 60 * 12 // 12h
  if (!Number.isFinite(parsed) || parsed <= 0) return 60 * 60 * 12
  return Math.floor(parsed)
}

export async function issueKioskAccessToken(params: {
  storeId: string
  ttlSeconds?: number
}): Promise<{ accessToken: string; expiresAt: string; expiresIn: number }> {
  const { storeId } = params
  const ttlSeconds = params.ttlSeconds ?? getDefaultTtlSeconds()

  if (!storeId) {
    throw new KioskAuthError("Cannot issue kiosk token: storeId is missing.", 500)
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const expSeconds = nowSeconds + ttlSeconds

  const accessToken = await new SignJWT({ storeId } satisfies KioskAccessTokenClaims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(KIOSK_JWT_ISSUER)
    .setAudience(KIOSK_JWT_AUDIENCE)
    .setSubject(storeId)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(expSeconds)
    .sign(getKioskJwtKey())

  return {
    accessToken,
    expiresAt: new Date(expSeconds * 1000).toISOString(),
    expiresIn: ttlSeconds,
  }
}

export async function verifyKioskAccessToken(
  token: string
): Promise<KioskAccessTokenClaims & { iat?: number; exp?: number }> {
  if (!token) throw new KioskAuthError("Missing access token.")

  try {
    const { payload } = await jwtVerify(token, getKioskJwtKey(), {
      issuer: KIOSK_JWT_ISSUER,
      audience: KIOSK_JWT_AUDIENCE,
    })

    const storeId =
      (typeof payload.storeId === "string" && payload.storeId) ||
      (typeof payload.sub === "string" && payload.sub) ||
      ""

    if (!storeId) throw new KioskAuthError("Invalid token payload: missing storeId.")

    return {
      storeId,
      iat: typeof payload.iat === "number" ? payload.iat : undefined,
      exp: typeof payload.exp === "number" ? payload.exp : undefined,
    }
  } catch (err) {
    // Normalize jose errors into a consistent 401
    if (err instanceof KioskAuthError) throw err
    throw new KioskAuthError("Invalid or expired access token.")
  }
}

export function getBearerTokenFromAuthHeader(authorization: string | null): string {
  if (!authorization) throw new KioskAuthError("Missing Authorization header.")

  const [scheme, ...rest] = authorization.split(" ")
  if (scheme !== "Bearer" || rest.length === 0) {
    throw new KioskAuthError("Invalid Authorization header format.")
  }

  const token = rest.join(" ").trim()
  if (!token) throw new KioskAuthError("Missing Bearer token.")
  return token
}

export async function requireKioskBearerAuth(headers: Headers): Promise<{
  storeId: string
}> {
  const token = getBearerTokenFromAuthHeader(headers.get("authorization"))
  const { storeId } = await verifyKioskAccessToken(token)
  return { storeId }
}


