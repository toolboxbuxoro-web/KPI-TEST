'use server'

import prisma from "@/lib/db"
import { testSchema } from "@/lib/schemas"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { z } from "zod"

export async function createTest(data: z.infer<typeof testSchema>) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const validated = testSchema.safeParse(data)

  if (!validated.success) {
    throw new Error("Invalid data")
  }

  await prisma.test.create({
    data: {
      title: validated.data.title,
      description: validated.data.description,
      createdBy: session.user.email || "unknown",
      timeLimit: validated.data.timeLimit && validated.data.timeLimit > 0 ? validated.data.timeLimit : null,
    },
  })

  revalidatePath("/admin/tests")
  redirect("/admin/tests")
}

export async function deleteTest(id: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  await prisma.test.delete({
    where: { id },
  })

  revalidatePath("/admin/tests")
}
