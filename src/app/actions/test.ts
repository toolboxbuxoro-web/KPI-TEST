'use server'

import prisma from "@/lib/db"
import { testSchema } from "@/lib/schemas"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createTest(formData: FormData) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description"),
  }

  const validated = testSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: validated.error.flatten() }
  }

  await prisma.test.create({
    data: {
      title: validated.data.title,
      description: validated.data.description,
      createdBy: session.user.email || "unknown",
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
