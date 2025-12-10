import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/api/auth/signin")

  return (
    <div className="flex min-h-screen w-full">
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-y-auto bg-background neo-pattern">
          <div className="p-4 md:p-8 w-full">
            <div className="mb-4 flex items-center gap-2">
              <SidebarTrigger className="hover:bg-accent/50 backdrop-blur-sm" />
            </div>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
