import { getDashboardStats, getLeaderboard, getChartData } from "@/app/actions/stats"
import { ExportButton } from "@/components/admin/export-button"
import { DashboardCharts } from "@/components/admin/dashboard-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, FileText, CheckCircle, Trophy, Clock, Percent } from "lucide-react"

export default async function AdminDashboard() {
  const stats = await getDashboardStats()
  const leaderboard = await getLeaderboard()
  const chartData = await getChartData()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Дашборд</h2>
        <ExportButton />
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Сотрудников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Тестов</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Сессий</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedSessions}</div>
          </CardContent>
        </Card>
        <Card>
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
        <Card>
          <CardHeader>
            <CardTitle>Лидеры по KPI</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Тест</TableHead>
                  <TableHead>Баллы</TableHead>
                  <TableHead className="text-right">KPI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.employee.firstName} {session.employee.lastName}
                    </TableCell>
                    <TableCell>{session.test.title}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">
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
