import { auth } from "@/auth"
import prisma from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const data = await prisma.employeeTestSession.findMany({
      where: { status: "completed" },
      include: {
        employee: true,
        test: true
      }
    })

    // Enhanced CSV generation for Excel
    const headers = [
      "Сотрудник", 
      "Должность", 
      "Тест", 
      "Баллы", 
      "Макс. баллов", 
      "Правильных", 
      "Всего вопросов", 
      "KPI %", 
      "Статус",
      "Начало",
      "Завершение",
      "Длительность (мин)"
    ]

    const rows = data.map(d => {
      const duration = d.startedAt && d.completedAt 
        ? Math.round((d.completedAt.getTime() - d.startedAt.getTime()) / (1000 * 60))
        : 0
      
      const isPassed = (d.kpiScore || 0) >= 80

      const formatDate = (date: Date | null) => {
        if (!date) return ""
        return date.toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      }

      return [
        `${d.employee.firstName} ${d.employee.lastName}`,
        d.employee.position,
        d.test.title,
        d.score,
        d.maxScore,
        d.correctAnswers,
        d.totalQuestions,
        d.kpiScore?.toFixed(2).replace('.', ','),
        isPassed ? "Сдан" : "Не сдан",
        formatDate(d.startedAt),
        formatDate(d.completedAt),
        duration
      ]
    })

    const csvContent = [
      headers.join(";"),
      ...rows.map(r => r.join(";"))
    ].join("\n")

    // Add BOM for Excel
    const finalContent = "\uFEFF" + csvContent

    return new NextResponse(finalContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="kpi-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error instanceof Error ? error.message : String(error))
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
