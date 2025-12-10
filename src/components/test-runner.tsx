'use client'

import { useState, useEffect } from "react"
import { submitAnswer, finishSession } from "@/app/actions/session"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle, Clock } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TestRunnerProps {
  session: any // Type this properly if possible
  employee?: {
    firstName: string | null
    lastName: string | null
    imageUrl: string | null
  } | null
}

export default function TestRunner({ session, employee }: TestRunnerProps) {
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

  // Timer Logic
  const timeLimitMinutes = session.test.timeLimit
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!timeLimitMinutes) return

    const startTime = new Date(session.startedAt).getTime()
    const endTime = startTime + timeLimitMinutes * 60 * 1000

    const timer = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
      
      setTimeLeft(remaining)

      if (remaining <= 0) {
        clearInterval(timer)
        handleAutoSubmit()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLimitMinutes, session.startedAt])

  const handleAutoSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    toast.info("Время вышло! Тест завершается...")
    try {
      await finishSession(session.id)
      router.refresh()
    } catch (error) {
      console.error("Error finishing session:", error instanceof Error ? error.message : String(error))
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Calculate points progress
  const totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0)
  const earnedPoints = questions
    .slice(0, currentIndex)
    .reduce((sum: number, q: any) => {
      const answer = session.answers.find((a: any) => a.questionId === q.id)
      if (!answer) return sum
      
      const selectedIds = answer.selectedOptionIds as string[]
      const correctOptionIds = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.id)
      const isCorrect = selectedIds.length === correctOptionIds.length && 
                        selectedIds.every((id: string) => correctOptionIds.includes(id))
      
      return sum + (isCorrect ? (q.points || 1) : 0)
    }, 0)
  const currentQuestionPoints = questions[currentIndex]?.points || 1

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
          <div className="flex items-center justify-between mb-4">
            {employee && (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                  <AvatarImage src={employee.imageUrl || undefined} />
                  <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
                    {employee.firstName?.[0] || ""}{employee.lastName?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">
                    {employee.firstName} {employee.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Вопрос {currentIndex + 1} из {questions.length}
                  </div>
                </div>
              </div>
            )}
            {!employee && (
              <span className="text-sm text-muted-foreground">
                Вопрос {currentIndex + 1} из {questions.length}
              </span>
            )}
            <div className="flex items-center gap-4">
              {timeLeft !== null && (
                <div className={`flex items-center gap-1 font-mono font-bold ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
                  <Clock className="h-4 w-4" />
                  {formatTime(timeLeft)}
                </div>
              )}
              <span className="text-sm font-medium text-blue-600">
                {session.test.title}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-green-600">
              💯 {earnedPoints} / {totalPoints} баллов
            </span>
            <span className="text-sm text-muted-foreground">
              За этот вопрос: {currentQuestionPoints} {currentQuestionPoints === 1 ? 'балл' : 'баллов'}
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
            {currentQuestion.questionType === "multi" ? (
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
