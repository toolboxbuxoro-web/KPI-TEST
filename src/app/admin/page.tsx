import { getDashboardStats, getLeaderboard, getChartData } from "@/app/actions/stats"
import { ExportButton } from "@/components/admin/export-button"
import { DashboardCharts } from "@/components/admin/dashboard-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, FileText, CheckCircle, Trophy, Clock, Percent, ShieldCheck, Store as StoreIcon } from "lucide-react"
import { auth } from "@/auth"
import { getRoleLabel } from "@/lib/permissions"
import type { Role } from "@/lib/permissions"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default async function AdminDashboard() {
  const stats = await getDashboardStats()
  const leaderboard = await getLeaderboard()
  const chartData = await getChartData()
  const session = await auth()
  
  const userRole = session?.user?.role as Role | undefined
  const userName = session?.user?.name || "Пользователь"
  
  // Получаем приветствие в зависимости от роли
  function getWelcomeMessage(role?: Role) {
    if (role === "SUPER_ADMIN") {
      return "У вас полный доступ ко всем функциям системы"
    }
    if (role === "STORE_MANAGER") {
      return "Управляйте сотрудниками и отслеживайте посещаемость вашего магазина"
    }
    return "Добро пожаловать в систему"
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Добро пожаловать, {userName}!
            </h2>
            <p className="text-muted-foreground mt-1">
              {getWelcomeMessage(userRole)}
            </p>
          </div>
          <ExportButton />
        </div>
        
        {userRole && (
          <Alert className="border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2">
              {userRole === "SUPER_ADMIN" && <ShieldCheck className="h-4 w-4 text-primary" />}
              {userRole === "STORE_MANAGER" && <StoreIcon className="h-4 w-4 text-primary" />}
              <AlertDescription className="text-sm">
                Ваша роль: <span className="font-semibold">{getRoleLabel(userRole)}</span>
              </AlertDescription>
            </div>
          </Alert>
        )}
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="neo-card neo-float">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Сотрудников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          </CardContent>
        </Card>
        <Card className="neo-card neo-float">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Тестов</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTests}</div>
          </CardContent>
        </Card>
        <Card className="neo-card neo-float">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Сессий</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedSessions}</div>
          </CardContent>
        </Card>
        <Card className="neo-card neo-float">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Проходимость</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.passRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <div className="grid gap-4">
        <Card className="neo-card">
          <CardHeader>
            <CardTitle>Лидеры по KPI</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted/50 border-white/10">
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Тест</TableHead>
                  <TableHead>Баллы</TableHead>
                  <TableHead className="text-right">KPI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((session: { id: string; employee: { firstName: string; lastName: string }; test: { title: string }; score: number; maxScore: number; correctAnswers: number; totalQuestions: number; kpiScore: number | null }) => (
                  <TableRow key={session.id} className="hover:bg-muted/50 border-white/10">
                    <TableCell className="font-medium">
                      {session.employee.firstName} {session.employee.lastName}
                    </TableCell>
                    <TableCell>{session.test.title}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {session.score}/{session.maxScore}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({session.correctAnswers}/{session.totalQuestions})
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {session.kpiScore?.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
                {leaderboard.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Нет данных
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
