import prisma from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import AddQuestionForm from "@/components/admin/add-question-form"
import { EditQuestionDialog } from "@/components/admin/edit-question-dialog"
import { AssignTestDialog } from "@/components/admin/assign-test-dialog"
import { DeleteQuestionButton } from "@/components/admin/delete-question-button"
import { RemoveAssignmentButton } from "@/components/admin/remove-assignment-button"

export default async function TestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      questions: {
        include: { options: true },
        orderBy: { id: 'asc' }
      },
      assignments: {
        include: { employee: true },
        orderBy: { assignedAt: 'desc' }
      }
    }
  })

  if (!test) return <div>Тест не найден</div>

  const allEmployees = await prisma.employee.findMany({
    orderBy: { firstName: "asc" }
  })

  const assignedEmployeeIds = test.assignments.map(a => a.employeeId)

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/tests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">{test.title}</h2>
          <p className="text-muted-foreground">{test.description}</p>
        </div>
        <AssignTestDialog 
          testId={test.id}
          testTitle={test.title}
          employees={allEmployees}
          assignedEmployeeIds={assignedEmployeeIds}
        />
      </div>

      {/* Assignments Section */}
      {test.assignments.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <CardTitle className="text-blue-900 dark:text-blue-100">
                Назначено сотрудникам
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({test.assignments.length})
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {test.assignments.map((assignment) => (
                <Badge 
                  key={assignment.id} 
                  variant="secondary" 
                  className="px-3 py-2 text-sm flex items-center gap-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {assignment.employee.firstName} {assignment.employee.lastName}
                  </span>
                  <RemoveAssignmentButton 
                    testId={test.id}
                    testTitle={test.title}
                    employeeId={assignment.employeeId}
                    employeeName={`${assignment.employee.firstName} ${assignment.employee.lastName}`}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 md:grid-cols-3">
        {/* Left Column: Questions List */}
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-xl font-semibold">Вопросы ({test.questions.length})</h3>
          
          {test.questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-medium flex-1">
                      {index + 1}. {question.text}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      💯 {question.points} {question.points === 1 ? 'балл' : 'баллов'}
                    </Badge>
                  </div>
                  {question.imageUrl && (
                    <img 
                      src={question.imageUrl} 
                      alt="Question Image" 
                      className="mt-2 rounded-md max-h-40 object-cover"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <EditQuestionDialog 
                    testId={test.id} 
                    question={{
                      id: question.id,
                      text: question.text,
                      imageUrl: question.imageUrl,
                      questionType: question.questionType,
                      points: question.points,
                      options: question.options.map(o => ({
                        id: o.id,
                        text: o.text,
                        isCorrect: o.isCorrect
                      }))
                    }} 
                  />
                  <DeleteQuestionButton 
                    questionId={question.id} 
                    testId={test.id} 
                    questionText={question.text} 
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 mt-2">
                  {question.options.map((option) => (
                    <div 
                      key={option.id} 
                      className={`flex items-center p-2 rounded-md border ${
                        option.isCorrect 
                          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900" 
                          : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mr-3 flex items-center justify-center ${
                        option.isCorrect ? "border-green-500 bg-green-500" : "border-gray-400"
                      }`}>
                        {option.isCorrect && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span className={option.isCorrect ? "font-medium text-green-700 dark:text-green-400" : ""}>
                        {option.text}
                      </span>
                      {option.isCorrect && (
                        <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800 hover:bg-green-100">
                          Верный
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {test.questions.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
              В этом тесте пока нет вопросов
            </div>
          )}
        </div>

        {/* Right Column: Add Question Form */}
        <div className="md:col-span-1">
          <div className="sticky top-8">
            <AddQuestionForm testId={test.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
