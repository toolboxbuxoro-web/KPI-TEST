import prisma from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { deleteQuestion } from "@/app/actions/question"
import AddQuestionForm from "@/components/admin/add-question-form"
import { EditQuestionDialog } from "@/components/admin/edit-question-dialog"

export default async function TestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      questions: {
        include: { options: true },
        orderBy: { id: 'asc' } // Or add an 'order' field later
      }
    }
  })

  if (!test) return <div>Тест не найден</div>

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/tests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{test.title}</h2>
          <p className="text-muted-foreground">{test.description}</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Left Column: Questions List */}
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-xl font-semibold">Вопросы ({test.questions.length})</h3>
          
          {test.questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    {index + 1}. {question.text}
                  </CardTitle>
                  {question.imageUrl && (
                    <img 
                      src={question.imageUrl} 
                      alt="Question Image" 
                      className="mt-2 rounded-md max-h-40 object-cover"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <EditQuestionDialog 
                    testId={test.id} 
                    question={{
                      id: question.id,
                      text: question.text,
                      imageUrl: question.imageUrl,
                      questionType: question.questionType,
                      options: question.options.map(o => ({
                        id: o.id,
                        text: o.text,
                        isCorrect: o.isCorrect
                      }))
                    }} 
                  />
                  <form action={async () => {
                    'use server'
                    await deleteQuestion(question.id, test.id)
                  }}>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
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
