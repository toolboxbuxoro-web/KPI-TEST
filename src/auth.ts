import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { authConfig } from "./auth.config"
import prisma from "@/lib/db"
import bcrypt from "bcryptjs"
import type { Role } from "@/lib/permissions"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = z.object({ email: z.string().email(), password: z.string() }).safeParse(credentials);
        
        if (parsed.success) {
            const { email, password } = parsed.data;

            // 1. Check Hardcoded Admin
            if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
                return { 
                  id: "admin", 
                  email: email, 
                  name: "Admin",
                  role: "SUPER_ADMIN" as Role,
                  storeId: null,
                  userType: 'EMPLOYEE' as const
                }
            }

            // 2. Check Database Employee
            const employee = await prisma.employee.findUnique({
                where: { email }
            })

            if (employee && employee.password) {
                const passwordsMatch = await bcrypt.compare(password, employee.password);
                if (passwordsMatch) {
                     // Check if active
                     if (!employee.isActive) return null;

                     return {
                        id: employee.id,
                        email: employee.email,
                        name: `${employee.firstName} ${employee.lastName}`,
                        role: employee.role as Role,
                        storeId: employee.storeId,
                        userType: 'EMPLOYEE' as const
                     }
                }
            }
        }
        return null
      },
    }),
  ],
})
