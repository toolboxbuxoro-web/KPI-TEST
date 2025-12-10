import type { NextAuthConfig } from "next-auth"
import type { Role } from "@/lib/permissions"

// Types are now in src/next-auth.d.ts

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.storeId = user.storeId
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as Role | undefined
        session.user.storeId = token.storeId as string | null | undefined
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');
      const isOnAccessDenied = nextUrl.pathname === '/access-denied';

      // Allow access to access-denied page
      if (isOnAccessDenied) return true;

      // 1. Redirect unauthenticated users to login
      if (isOnAdmin && !isLoggedIn) {
        return false;
      }

      // 2. Role-based access control for Admin Panel
      if (isOnAdmin && isLoggedIn) {
        // SUPER_ADMIN has full access
        if (role === 'SUPER_ADMIN') return true;

        // STORE_MANAGER access
        if (role === 'STORE_MANAGER') {
            // Allowed routes
            if (
                nextUrl.pathname === '/admin' ||
                nextUrl.pathname.startsWith('/admin/employees') ||
                nextUrl.pathname.startsWith('/admin/attendance') ||
                nextUrl.pathname.startsWith('/admin/tests')
            ) {
                return true;
            }
            // Block restricted routes - redirect to access denied
            return Response.redirect(new URL('/access-denied', nextUrl));
        }

        // EMPLOYEE access to admin panel - redirect to their dashboard
        if (role === 'EMPLOYEE') {
            return Response.redirect(new URL('/access-denied', nextUrl));
        }
      }

      return true;
    },
  },
  providers: [], // Configured in auth.ts
} satisfies NextAuthConfig
