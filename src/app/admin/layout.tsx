import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  History, 
  LogOut 
} from "lucide-react"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/api/auth/signin")

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Toolbox KPI</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Дашборд
            </Button>
          </Link>
          <Link href="/admin/tests">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <FileText className="w-4 h-4" />
              Тесты
            </Button>
          </Link>
          <Link href="/admin/employees">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Users className="w-4 h-4" />
              Сотрудники
            </Button>
          </Link>
          <Link href="/admin/audit">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <History className="w-4 h-4" />
              Аудит
            </Button>
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              {session.user.name?.[0] || "A"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{session.user.name}</p>
              <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
            </div>
          </div>
          <Link href="/api/auth/signout">
            <Button variant="outline" className="w-full gap-2">
              <LogOut className="w-4 h-4" />
              Выйти
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
