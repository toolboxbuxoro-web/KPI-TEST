'use server'

import prisma from "@/lib/db"
import { answerSchema } from "@/lib/schemas"
import { redis } from "@/lib/redis"
import { revalidatePath } from "next/cache"

export async function startSession(employeeId: string, testId: string) {
  // Check if session already exists
  const existing = await prisma.employeeTestSession.findFirst({
    where: { employeeId, testId, status: "pending" }
  })

  if (existing) return existing

  const session = await prisma.employeeTestSession.create({
    data: {
      employeeId,
      testId,
      status: "pending",
    }
  })

  return session
}

export async function submitAnswer(data: any) {
  const validated = answerSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.flatten() }

  const { sessionId, questionId, selectedOptionIds } = validated.data

  // Check if answer exists, update if so
  const existing = await prisma.employeeAnswer.findFirst({
    where: { sessionId, questionId }
  })

  if (existing) {
    await prisma.employeeAnswer.update({
      where: { id: existing.id },
      data: { selectedOptionIds }
    })
  } else {
    await prisma.employeeAnswer.create({
      data: {
        sessionId,
        questionId,
        selectedOptionIds
      }
    })
  }

  return { success: true }
}

export async function finishSession(sessionId: string) {
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

  if (!session) throw new Error("Session not found")

  let correctCount = 0
  const totalQuestions = session.test.questions.length

  session.test.questions.forEach(question => {
    const answer = session.answers.find(a => a.questionId === question.id)
    if (!answer) return

    const selectedIds = answer.selectedOptionIds as string[]
    const correctOptionIds = question.options.filter(o => o.isCorrect).map(o => o.id)

    // Check if arrays match (ignoring order)
    const isCorrect = selectedIds.length === correctOptionIds.length && 
                      selectedIds.every(id => correctOptionIds.includes(id))
    
    if (isCorrect) correctCount++
  })

  const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0

  await prisma.employeeTestSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      completedAt: new Date(),
      score: correctCount,
      kpiScore: score
    }
  })

  // Invalidate Cache
  await redis.del("dashboard:stats")
  await redis.del("leaderboard")

  revalidatePath(`/tests/${sessionId}`)
  return { success: true, score }
}
