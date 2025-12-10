import prisma from "@/lib/db"
import { startSession } from "@/app/actions/session"
import { getAssignedTests } from "@/app/actions/assignment"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Play, CheckCircle, Clock } from "lucide-react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { TestFilterToggle } from "@/components/employee/test-filter-toggle"

export default async function EmployeeDashboard({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams?: Promise<{ showAll?: string }>
}) {
  const { id } = await params
  const search = await searchParams
  const showAllTests = search?.showAll === 'true'

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

  // Get assigned tests
  const assignedTests = await getAssignedTests(id)
  
  // Check if assignment system is being used (any assignments exist in the system)
  const assignmentSystemActive = await prisma.testAssignment.count() > 0
  
  // Check if this employee has any assignments
  const hasAssignments = assignedTests.length > 0
  
  // Determine which tests to show based on toggle
  let allTests
  if (showAllTests) {
    // Show all tests when toggle is on
    allTests = await prisma.test.findMany({ orderBy: { createdAt: "desc" } })
  } else {
    // If assignment system is active, show only assigned tests (even if empty)
    // Otherwise show all tests (backward compatibility when no assignments exist)
    allTests = assignedTests
  }

  const pendingSessions = employee.sessions.filter(s => s.status === "pending")
  const completedSessions = employee.sessions.filter(s => s.status === "completed")
  
  // Create a map of testId -> latestSessionStartedAt
  const lastSessionMap = new Map<string, Date>()
  employee.sessions.forEach(s => {
    const current = lastSessionMap.get(s.testId)
    if (!current || s.startedAt > current) {
      lastSessionMap.set(s.testId, s.startedAt)
    }
  })

  const availableTests = allTests.filter(t => {
    // If no session exists, it's available
    if (!lastSessionMap.has(t.id)) return true
    
    // If session exists, check if it was assigned AFTER the last session started
    // We need to cast t because we added assignedAt property in the action
    const assignedTest = t as typeof t & { assignedAt?: Date }
    
    if (assignedTest.assignedAt) {
      const lastSessionDate = lastSessionMap.get(t.id)!
      return assignedTest.assignedAt > lastSessionDate
    }
    
    return false
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
              <AvatarImage src={employee.imageUrl || undefined} />
              <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-xl font-semibold">
                {employee.firstName?.[0] || ""}{employee.lastName?.[0] || ""}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">Привет, {employee.firstName}!</h1>
              <p className="text-muted-foreground">Ваша панель тестирования</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{employee.position}</p>
            {/* Debug info - Development only */}
            {process.env.NODE_ENV === 'development' && (
              <Card className="mt-4 border-dashed border-2 border-orange-300 bg-orange-50 dark:bg-orange-950/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-400">
                      🔧 Dev Mode
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <p className="flex items-center gap-1">
                        <span className="font-semibold">Система назначений:</span>
                        <Badge variant={assignmentSystemActive ? "default" : "secondary"} className="h-5 text-[10px]">
                          {assignmentSystemActive ? 'Активна' : 'Неактивна'}
                        </Badge>
                      </p>
                      <p><span className="font-semibold">Назначено:</span> {assignedTests.length}</p>
                      <p><span className="font-semibold">Доступно:</span> {availableTests.length}</p>
                    </div>
                    <div className="space-y-1">
                      <p><span className="font-semibold">Режим:</span> {showAllTests ? '🌐 Все' : '🎯 Назначенные'}</p>
                      <p><span className="font-semibold">В процессе:</span> {pendingSessions.length}</p>
                      <p><span className="font-semibold">Завершено:</span> {completedSessions.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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
                <Card key={session.id} className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-orange-900 dark:text-orange-100">{session.test.title}</CardTitle>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">В процессе</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/tests/${session.id}`}>
                      <Button className="w-full bg-orange-600 hover:bg-orange-700" size="lg">
                        <Clock className="mr-2 h-4 w-4" />
                        Продолжить тест
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Available Tests */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-500" />
                Доступные тесты
              </h2>
              {assignmentSystemActive && (
                <Badge 
                  variant={showAllTests ? "outline" : "default"}
                  className={`text-xs ${!showAllTests ? 'bg-blue-500 hover:bg-blue-600' : 'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300'}`}
                >
                  {showAllTests ? (
                    <>🌐 Все тесты</>
                  ) : (
                    <>🎯 Назначенные вам</>
                  )}
                </Badge>
              )}
            </div>
            {assignmentSystemActive && (
              <TestFilterToggle employeeId={id} />
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {availableTests.map(test => (
              <Card key={test.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {test.title}
                      </CardTitle>
                      {test.description && (
                        <p className="text-sm text-muted-foreground mt-2">{test.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      Новый
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <form action={async () => {
                    'use server'
                    const session = await startSession(employee.id, test.id)
                    redirect(`/tests/${session.id}`)
                  }}>
                    <Button className="w-full" variant="default" size="lg">
                      <Play className="mr-2 h-4 w-4" />
                      Начать тест
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
            {availableTests.length === 0 && (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {showAllTests 
                      ? "Все тесты пройдены"
                      : "Нет назначенных тестов"}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {showAllTests 
                      ? "Вы прошли все доступные тесты. Отличная работа!"
                      : "Администратор ещё не назначил вам тесты. Проверьте позже."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* History */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            История
          </h2>
          <div className="space-y-3">
            {completedSessions.map(session => {
              const isPassed = session.kpiScore! >= 80
              return (
                <Card key={session.id} className={`hover:shadow-md transition-shadow border-l-4 ${isPassed ? 'border-l-green-500' : 'border-l-gray-400'}`}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isPassed ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        {isPassed ? (
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-base">{session.test.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {session.completedAt?.toLocaleDateString("ru-RU", { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </p>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className="text-xs text-muted-foreground">
                            {session.correctAnswers}/{session.totalQuestions} правильных
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge 
                        variant={isPassed ? "default" : "secondary"}
                        className={isPassed ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {isPassed ? "✓" : "○"} KPI: {session.kpiScore!.toFixed(0)}%
                      </Badge>
                      <div className="flex items-center justify-end gap-1 text-sm">
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {session.score}
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">
                          {session.maxScore}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">баллов</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {completedSessions.length === 0 && (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <CheckCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    История тестов пуста
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
