import prisma from "@/lib/db"
import TestRunner from "@/components/test-runner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { notFound } from "next/navigation"
import { CheckCircle2, XCircle, FileText } from "lucide-react"

export default async function TestSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const session = await prisma.employeeTestSession.findUnique({
    where: { id: sessionId },
    include: {
      test: {
        include: {
          questions: {
            include: { options: true }
          }
        }
      },
      answers: true,
      employee: true
    }
  })

  if (!session) notFound()

  if (session.status === "completed") {
    const passed = (session.kpiScore || 0) >= session.test.passingScore
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-background shadow-lg">
                <AvatarImage src={session.employee.imageUrl || undefined} />
                <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-2xl font-semibold">
                  {session.employee.firstName?.[0] || ""}{session.employee.lastName?.[0] || ""}
                </AvatarFallback>
              </Avatar>
              <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${
                passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
              }`}>
                {passed ? (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{passed ? "Тест сдан!" : "Тест не сдан"}</h1>
              <p className="text-muted-foreground">
                Ваш результат: <span className={`font-bold ${passed ? "text-green-600" : "text-red-600"}`}>
                  {session.kpiScore?.toFixed(0)}%
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Проходной балл: {session.test.passingScore}%
              </p>
            </div>
          </div>

          {/* Detailed Results */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-transparent p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💯</span>
                    <span className="text-sm font-medium">Набрано баллов</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {session.score} / {session.maxScore}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Правильных ответов</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {session.correctAnswers}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium">Неправильных ответов</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    {session.incorrectAnswers}
                  </span>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium">Всего вопросов</span>
                  </div>
                  <span className="text-lg font-bold">
                    {session.totalQuestions}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="pt-4">
             <a href={`/employee/${session.employeeId}`}>
              <Button className="w-full">Вернуться в дашборд</Button>
            </a>
          </div>
        </div>
      </div>
    )
  }

  return <TestRunner session={session} employee={session.employee} />
}
