'use server'

import prisma from "@/lib/db"
import { auth } from "@/auth"

export async function exportData(type: "csv" | "json") {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const data = await prisma.employeeTestSession.findMany({
    where: { status: "completed" },
    include: {
      employee: true,
      test: true
    }
  })

  if (type === "json") {
    return JSON.stringify(data, null, 2)
  }

  // Simple CSV generation
  const headers = ["Employee Name", "Position", "Test Title", "Score", "KPI %", "Date"]
  const rows = data.map(d => [
    `${d.employee.firstName} ${d.employee.lastName}`,
    d.employee.position,
    d.test.title,
    d.score,
    d.kpiScore?.toFixed(2),
    d.completedAt?.toISOString()
  ])

  const csvContent = [
    headers.join(","),
    ...rows.map(r => r.join(","))
  ].join("\n")

  return csvContent
}
