import "server-only"

import { auth } from "@/auth"
import type { Role } from "@/lib/permissions"

export type AuthSession = Awaited<ReturnType<typeof auth>>

export function isAdminRole(role: Role | undefined): role is Exclude<Role, "EMPLOYEE"> {
  return role === "SUPER_ADMIN" || role === "STORE_MANAGER"
}

/**
 * Server-side guard for Server Actions / Route Handlers.
 * Throws on failure (so callers can't accidentally proceed).
 */
export async function requireSessionUser(options?: { roles?: Role[] }) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  if (options?.roles) {
    const role = session.user.role
    if (!role || !options.roles.includes(role)) {
      throw new Error("Forbidden")
    }
  }

  return session
}






