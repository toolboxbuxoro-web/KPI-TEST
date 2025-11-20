import prisma from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EmployeeDialog } from "@/components/admin/employee-dialog"
import { EmployeeActions } from "@/components/admin/employee-actions"
import { EmployeeSearch } from "@/components/admin/employee-search"

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
      }
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
                <TableHead>Имя</TableHead>
                <TableHead>Должность</TableHead>
                <TableHead>Последний тест</TableHead>
                <TableHead>Последний KPI</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const lastSession = employee.sessions[0]
                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.firstName} {employee.lastName}
                      <div className="text-xs text-muted-foreground font-mono mt-1">
                        /employee/{employee.id}
                      </div>
                    </TableCell>
                    <TableCell>{employee.position}</TableCell>
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
                  <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
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
