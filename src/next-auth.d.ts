import { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"
import { Role } from "@/lib/permissions"

declare module "next-auth" {
  interface User {
    role?: Role
    storeId?: string | null
  }
  interface Session {
    user: {
      id: string
      role?: Role
      storeId?: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role
    storeId?: string | null
  }
}
