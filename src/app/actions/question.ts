'use server'

import prisma from "@/lib/db"
import { questionSchema } from "@/lib/schemas"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function addQuestion(data: any) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const validated = questionSchema.safeParse(data)

  if (!validated.success) {
    return { error: validated.error.flatten() }
  }

  const { testId, text, imageUrl, questionType, options } = validated.data

  await prisma.question.create({
    data: {
      testId,
      text,
      imageUrl,
      questionType,
      options: {
        create: options.map(opt => ({
          text: opt.text,
          isCorrect: opt.isCorrect
        }))
      }
    }
  })

  revalidatePath(`/admin/tests/${testId}`)
  return { success: true }
}

export async function deleteQuestion(id: string, testId: string) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")
  
    await prisma.question.delete({
      where: { id },
    })
  
    revalidatePath(`/admin/tests/${testId}`)
}
