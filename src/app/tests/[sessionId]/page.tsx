import prisma from "@/lib/db"
import TestRunner from "@/components/test-runner"
import { Button } from "@/components/ui/button"
import { notFound } from "next/navigation"

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
      answers: true
    }
  })

  if (!session) notFound()

  if (session.status === "completed") {
    const passed = (session.kpiScore || 0) >= session.test.passingScore
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${
            passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          }`}>
            {passed ? (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            )}
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

          <div className="pt-4">
             <a href={`/employee/${session.employeeId}`}>
              <Button className="w-full">Вернуться в дашборд</Button>
            </a>
          </div>
        </div>
      </div>
    )
  }

  return <TestRunner session={session} />
}
