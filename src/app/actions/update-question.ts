'use server'

import prisma from "@/lib/db"
import { questionSchema } from "@/lib/schemas"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function updateQuestion(
  questionId: string, 
  testId: string,
  data: {
    text: string
    imageUrl?: string
    questionType: "single" | "multi"
    options: { id?: string; text: string; isCorrect: boolean }[]
  }
) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  // Validate basic fields (reuse schema partially or create new one if needed)
  // For simplicity, manual validation or reuse schema logic
  if (!data.text || data.options.length < 2) {
    return { error: "Invalid data" }
  }

  // Transaction to update question and replace options
  await prisma.$transaction(async (tx) => {
    // Update question details
    await tx.question.update({
      where: { id: questionId },
      data: {
        text: data.text,
        imageUrl: data.imageUrl,
        questionType: data.questionType,
      }
    })

    // Handle options: 
    // Strategy: Delete all existing options and recreate them (easiest for now)
    // OR: Update existing ones if ID provided, create new ones if not.
    // Let's go with Delete + Create for simplicity to ensure consistency
    
    await tx.answerOption.deleteMany({
      where: { questionId }
    })

    await tx.answerOption.createMany({
      data: data.options.map(opt => ({
        questionId,
        text: opt.text,
        isCorrect: opt.isCorrect
      }))
    })
  })

  revalidatePath(`/admin/tests/${testId}`)
  return { success: true }
}
