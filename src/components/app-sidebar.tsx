"use client"

import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  History, 
  LogOut,
  Settings,
  Calendar,
  Store,
  ShieldCheck,
  User as UserIcon
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import type { Role } from "@/lib/permissions"
import { getRoleLabel } from "@/lib/permissions"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

// Определяем доступные пункты меню для каждой роли
const menuItemsByRole: Record<string, string[]> = {
  SUPER_ADMIN: ["/admin", "/admin/employees", "/admin/stores", "/admin/tests", "/admin/attendance", "/admin/audit"],
  STORE_MANAGER: ["/admin", "/admin/employees", "/admin/attendance", "/admin/tests"],
  EMPLOYEE: [], // Сотрудники не имеют доступа к админке
}

// Menu items.
const items = [
  {
    title: "Дашборд",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Сотрудники",
    url: "/admin/employees",
    icon: Users,
  },
  {
    title: "Посещаемость",
    url: "/admin/attendance",
    icon: Calendar,
  },
  {
    title: "Тесты",
    url: "/admin/tests",
    icon: FileText,
  },
  {
    title: "Магазины",
    url: "/admin/stores",
    icon: Store,
  },
  {
    title: "Аудит",
    url: "/admin/audit",
    icon: History,
  },
]

// Получаем иконку для роли
function getRoleIcon(role?: string) {
  if (role === "SUPER_ADMIN") return ShieldCheck
  if (role === "STORE_MANAGER") return Store
  return UserIcon
}

// Получаем цвет бейджа для роли
function getRoleBadgeVariant(role?: string): "default" | "secondary" | "outline" {
  if (role === "SUPER_ADMIN") return "default"
  if (role === "STORE_MANAGER") return "secondary"
  return "outline"
}

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  
  // Фильтруем пункты меню в зависимости от роли
  const userRole = session?.user?.role as Role | undefined
  const allowedUrls = userRole ? menuItemsByRole[userRole] || [] : []
  const visibleItems = items.filter(item => allowedUrls.includes(item.url))
  
  const RoleIcon = getRoleIcon(userRole)

  return (
    <Sidebar collapsible="icon" className="neo-sidebar">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg neo-gradient text-primary-foreground font-bold">
            T
          </div>
          <span className="font-bold text-lg truncate group-data-[collapsible=icon]:hidden bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Toolbox
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Меню</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.length > 0 ? (
                visibleItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={
                        item.url === "/admin" 
                          ? pathname === "/admin"
                          : pathname === item.url || pathname?.startsWith(item.url + "/")
                      }
                      tooltip={item.title}
                      className="neo-float"
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                <div className="px-2 py-4 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
                  Нет доступных разделов
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={session?.user?.image || undefined} alt={session?.user?.name || ""} />
                <AvatarFallback className="rounded-lg">
                  {session?.user?.name?.[0] || "A"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{session?.user?.name || "Admin"}</span>
                <div className="flex items-center gap-1">
                  <Badge variant={getRoleBadgeVariant(userRole)} className="text-[10px] px-1 py-0 h-4">
                    <RoleIcon className="h-2.5 w-2.5 mr-0.5" />
                    {userRole ? getRoleLabel(userRole as Role) : "Гость"}
                  </Badge>
                </div>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => signOut({ callbackUrl: "/login" })}
              tooltip="Выйти"
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <LogOut />
              <span>Выйти</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
