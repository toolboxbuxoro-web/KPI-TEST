'use client'

import { useState } from "react"
import { submitAnswer, finishSession } from "@/app/actions/session"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle } from "lucide-react"

interface TestRunnerProps {
  session: any // Type this properly if possible
}

export default function TestRunner({ session }: TestRunnerProps) {
  const router = useRouter()
  const questions = session.test.questions
  
  // Calculate initial index based on answers
  const initialIndex = questions.findIndex((q: any) => 
    !session.answers.some((a: any) => a.questionId === q.id)
  )
  const startIndex = initialIndex === -1 ? 0 : initialIndex

  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [answers, setAnswers] = useState<Record<string, string[]>>(() => {
    // Initialize with existing answers
    const initial: Record<string, string[]> = {}
    session.answers.forEach((a: any) => {
      initial[a.questionId] = a.selectedOptionIds
    })
    return initial
  })
  const [submitting, setSubmitting] = useState(false)

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>В тесте нет вопросов</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Администратор еще не добавил вопросы в этот тест.</p>
            <Button onClick={() => router.back()}>Вернуться назад</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  const handleSelect = (optionId: string, type: "single" | "multi") => {
    const current = answers[currentQuestion.id] || []
    let newSelection: string[] = []

    if (type === "single") {
      newSelection = [optionId]
    } else {
      if (current.includes(optionId)) {
        newSelection = current.filter(id => id !== optionId)
      } else {
        newSelection = [...current, optionId]
      }
    }

    setAnswers((prev: Record<string, string[]>) => ({ ...prev, [currentQuestion.id]: newSelection }))
  }

  const handleNext = async () => {
    // Save current answer
    const selectedIds = answers[currentQuestion.id]
    if (!selectedIds || selectedIds.length === 0) {
      toast.warning("Выберите вариант ответа")
      return
    }

    setSubmitting(true)
    try {
      await submitAnswer({
        sessionId: session.id,
        questionId: currentQuestion.id,
        selectedOptionIds: selectedIds
      })
      
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        // Finish
        await finishSession(session.id)
        toast.success("Тест завершен!")
        router.refresh()
      }
    } catch (error) {
      toast.error("Ошибка сохранения")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Вопрос {currentIndex + 1} из {questions.length}
            </span>
            <span className="text-sm font-medium text-blue-600">
              {session.test.title}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{currentQuestion.text}</h2>
            {currentQuestion.imageUrl && (
              <img 
                src={currentQuestion.imageUrl} 
                alt="Question" 
                className="rounded-lg max-h-60 object-contain mx-auto"
              />
            )}
          </div>

          <div className="space-y-3">
            {currentQuestion.questionsType === "multi" ? (
              // Checkboxes for multi
              currentQuestion.options.map((option: any) => (
                <div key={option.id} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50 cursor-pointer" onClick={() => handleSelect(option.id, "multi")}>
                  <Checkbox 
                    id={option.id} 
                    checked={(answers[currentQuestion.id] || []).includes(option.id)}
                    onCheckedChange={() => handleSelect(option.id, "multi")}
                  />
                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">{option.text}</Label>
                </div>
              ))
            ) : (
              // Radio for single
              <RadioGroup 
                value={(answers[currentQuestion.id] || [])[0]} 
                onValueChange={(val) => handleSelect(val, "single")}
              >
                {currentQuestion.options.map((option: any) => (
                  <div key={option.id} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">{option.text}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleNext} disabled={submitting} className="w-full sm:w-auto">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentIndex === questions.length - 1 ? "Завершить тест" : "Следующий вопрос"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
