import prisma from "@/lib/db"
import { startSession } from "@/app/actions/session"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, CheckCircle, Clock } from "lucide-react"
import { redirect } from "next/navigation"

export default async function EmployeeDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      sessions: {
        include: { test: true },
        orderBy: { startedAt: "desc" }
      }
    }
  })

  if (!employee) return <div className="p-8 text-center">Сотрудник не найден</div>

  // Get all tests to show available ones
  const allTests = await prisma.test.findMany({
    orderBy: { createdAt: "desc" }
  })

  // Filter tests:
  // - Pending: Session exists and status is pending
  // - Completed: Session exists and status is completed
  // - Available: No session exists (or maybe allow retake? For now, assume one take per test)
  
  const pendingSessions = employee.sessions.filter(s => s.status === "pending")
  const completedSessions = employee.sessions.filter(s => s.status === "completed")
  
  const takenTestIds = new Set(employee.sessions.map(s => s.testId))
  const availableTests = allTests.filter(t => !takenTestIds.has(t.id))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Привет, {employee.firstName}!</h1>
            <p className="text-muted-foreground">Ваша панель тестирования</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{employee.position}</p>
          </div>
        </div>

        {/* Pending Tests */}
        {pendingSessions.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Продолжить тестирование
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {pendingSessions.map(session => (
                <Card key={session.id} className="border-orange-200 bg-orange-50 dark:bg-orange-900/10">
                  <CardHeader>
                    <CardTitle>{session.test.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/tests/${session.id}`}>
                      <Button className="w-full">Продолжить</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Available Tests */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-500" />
            Доступные тесты
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {availableTests.map(test => (
              <Card key={test.id}>
                <CardHeader>
                  <CardTitle>{test.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{test.description}</p>
                </CardHeader>
                <CardContent>
                  <form action={async () => {
                    'use server'
                    const session = await startSession(employee.id, test.id)
                    redirect(`/tests/${session.id}`)
                  }}>
                    <Button className="w-full" variant="default">Начать тест</Button>
                  </form>
                </CardContent>
              </Card>
            ))}
            {availableTests.length === 0 && (
              <p className="text-muted-foreground">Нет доступных новых тестов.</p>
            )}
          </div>
        </section>

        {/* History */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            История
          </h2>
          <div className="space-y-2">
            {completedSessions.map(session => (
              <Card key={session.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{session.test.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.completedAt?.toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={session.kpiScore! >= 80 ? "default" : "secondary"}>
                      KPI: {session.kpiScore!.toFixed(0)}%
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {session.score} баллов
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {completedSessions.length === 0 && (
              <p className="text-muted-foreground">История пуста.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

import Link from "next/link"
