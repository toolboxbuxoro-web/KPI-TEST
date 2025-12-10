import prisma from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EmployeeDialog } from "@/components/admin/employee-dialog"
import { EmployeeActions } from "@/components/admin/employee-actions"
import { EmployeeSearch } from "@/components/admin/employee-search"
import { ScanFace, AlertCircle } from "lucide-react"

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    query?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const query = params?.query || ""

  const employees = await prisma.employee.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { position: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      sessions: {
        where: { status: "completed" },
        orderBy: { completedAt: "desc" },
        take: 1
      },
      documents: true
    },
    orderBy: { createdAt: "desc" }
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Сотрудники</h2>
        <EmployeeDialog />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Список сотрудников</CardTitle>
          <EmployeeSearch />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Должность</TableHead>
                <TableHead>Биометрия</TableHead>
                <TableHead>Последний тест</TableHead>
                <TableHead>Последний KPI</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const lastSession = employee.sessions[0]
                const hasBiometrics = !!employee.faceDescriptor && !!employee.consentSignedAt
                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={employee.imageUrl || undefined} />
                          <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
                            {employee.firstName?.[0] || ""}{employee.lastName?.[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <a href={`/admin/employees/${employee.id}`} className="font-medium hover:underline">
                            {employee.firstName} {employee.lastName}
                          </a>
                          <div className="text-xs text-muted-foreground font-mono">
                            {employee.position}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>
                      {hasBiometrics ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
                          <ScanFace className="h-3 w-3" />
                          Активна
                        </Badge>
                      ) : employee.imageUrl ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Не настроена
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground gap-1">
                          Нет фото
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {lastSession ? new Date(lastSession.completedAt!).toLocaleDateString("ru-RU") : "-"}
                    </TableCell>
                    <TableCell>
                      {lastSession ? (
                        <Badge variant={lastSession.kpiScore! >= 80 ? "default" : "secondary"}>
                          {lastSession.kpiScore!.toFixed(1)}%
                        </Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <EmployeeActions employee={employee} />
                    </TableCell>
                  </TableRow>
                )
              })}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    Сотрудники не найдены
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

