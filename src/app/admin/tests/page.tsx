import prisma from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit } from "lucide-react"
import { AssignTestDialog } from "@/components/admin/assign-test-dialog"
import { DeleteTestButton } from "@/components/admin/delete-test-button"

export default async function TestsPage() {
  const tests = await prisma.test.findMany({
    orderBy: { createdAt: "desc" },
    include: { 
      _count: { 
        select: { 
          questions: true, 
          sessions: true,
          assignments: true 
        } 
      },
      assignments: {
        select: {
          employeeId: true
        }
      }
    }
  })

  const employees = await prisma.employee.findMany({
    orderBy: { firstName: "asc" }
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Управление тестами</h2>
        <Link href="/admin/tests/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Создать тест
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список тестов</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Вопросов</TableHead>
                <TableHead>Прохождений</TableHead>
                <TableHead>Назначений</TableHead>
                <TableHead>Создан</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">{test.title}</TableCell>
                  <TableCell>{test._count.questions}</TableCell>
                  <TableCell>{test._count.sessions}</TableCell>
                  <TableCell>{test._count.assignments}</TableCell>
                  <TableCell>{test.createdAt.toLocaleDateString("ru-RU")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <AssignTestDialog 
                        testId={test.id}
                        testTitle={test.title}
                        employees={employees}
                        assignedEmployeeIds={test.assignments.map(a => a.employeeId)}
                      />
                      <Link href={`/admin/tests/${test.id}`}>
                        <Button variant="outline" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <DeleteTestButton testId={test.id} testTitle={test.title} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Тесты не найдены
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
