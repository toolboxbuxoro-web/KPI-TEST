"use client"

import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  History, 
  LogOut,
  Settings,
  Calendar,
  Store
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"

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
import { Button } from "@/components/ui/button"

// Menu items.
const items = [
  {
    title: "Дашборд",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Тесты",
    url: "/admin/tests",
    icon: FileText,
  },
  {
    title: "Сотрудники",
    url: "/admin/employees",
    icon: Users,
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
  {
    title: "Посещаемость",
    url: "/admin/attendance",
    icon: Calendar,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <Sidebar collapsible="icon" className="backdrop-blur-2xl bg-sidebar/80 border-r border-white/10">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold shadow-lg shadow-primary/25">
            TC
          </div>
          <span className="font-bold text-lg truncate group-data-[collapsible=icon]:hidden bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Toolbox Control
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Меню</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url || pathname?.startsWith(item.url + "/")}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
                <span className="truncate text-xs text-muted-foreground">{session?.user?.email}</span>
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
