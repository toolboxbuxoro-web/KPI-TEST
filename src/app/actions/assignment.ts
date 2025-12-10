'use server'

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function assignTest(testId: string, employeeIds: string[], assignedBy: string) {
  try {
    // Create assignments for each employee
    const assignments = await Promise.all(
      employeeIds.map(employeeId =>
        prisma.testAssignment.upsert({
          where: {
            testId_employeeId: {
              testId,
              employeeId
            }
          },
          create: {
            testId,
            employeeId,
            assignedBy
          },
          update: {
            assignedBy,
            assignedAt: new Date()
          }
        })
      )
    )

    revalidatePath('/admin/tests')
    revalidatePath(`/admin/tests/${testId}`)
    
    return { success: true, count: assignments.length }
  } catch (error) {
    console.error('Error assigning test:', error instanceof Error ? error.message : String(error))
    return { error: 'Failed to assign test' }
  }
}

export async function removeAssignment(testId: string, employeeId: string) {
  try {
    await prisma.testAssignment.delete({
      where: {
        testId_employeeId: {
          testId,
          employeeId
        }
      }
    })

    revalidatePath('/admin/tests')
    revalidatePath(`/admin/tests/${testId}`)
    revalidatePath(`/employee/${employeeId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error removing assignment:', error instanceof Error ? error.message : String(error))
    return { error: 'Failed to remove assignment' }
  }
}

export async function getAssignedTests(employeeId: string) {
  const assignments = await prisma.testAssignment.findMany({
    where: { employeeId },
    include: {
      test: {
        include: {
          _count: {
            select: { questions: true }
          }
        }
      }
    },
    orderBy: { assignedAt: 'desc' }
  })

  return assignments.map(a => ({
    ...a.test,
    assignedAt: a.assignedAt
  }))
}

export async function getTestAssignments(testId: string) {
  const assignments = await prisma.testAssignment.findMany({
    where: { testId },
    include: {
      employee: true
    },
    orderBy: { assignedAt: 'desc' }
  })

  return assignments
}

export async function hasAnyAssignments() {
  const count = await prisma.testAssignment.count()
  return count > 0
}
