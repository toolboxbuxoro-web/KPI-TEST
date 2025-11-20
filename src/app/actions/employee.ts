'use server'

import prisma from "@/lib/db"
import { employeeSchema } from "@/lib/schemas"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function createEmployee(data: { firstName: string; lastName: string; position: string }) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const validated = employeeSchema.safeParse(data)
  if (!validated.success) {
    return { error: validated.error.flatten() }
  }

  await prisma.employee.create({
    data: validated.data
  })

  revalidatePath("/admin/employees")
  return { success: true }
}

export async function updateEmployee(id: string, data: { firstName: string; lastName: string; position: string }) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const validated = employeeSchema.safeParse(data)
  if (!validated.success) {
    return { error: validated.error.flatten() }
  }

  await prisma.employee.update({
    where: { id },
    data: validated.data
  })

  revalidatePath("/admin/employees")
  return { success: true }
}

export async function deleteEmployee(id: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  await prisma.employee.delete({
    where: { id }
  })

  revalidatePath("/admin/employees")
  return { success: true }
}
