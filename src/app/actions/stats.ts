'use server'

import prisma from "@/lib/db"
import { redis } from "@/lib/redis"

export interface DashboardStats {
  totalEmployees: number
  totalTests: number
  completedSessions: number
  avgScore: number
  passRate: number
  avgDuration: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Try cache
  const cached = await redis.get("dashboard:stats")
  if (cached) return JSON.parse(cached) as DashboardStats

  const [totalEmployees, totalTests, completedSessions, avgScore, allSessions] = await Promise.all([
    prisma.employee.count(),
    prisma.test.count(),
    prisma.employeeTestSession.count({ where: { status: "completed" } }),
    prisma.employeeTestSession.aggregate({
      _avg: { kpiScore: true },
      where: { status: "completed" }
    }),
    prisma.employeeTestSession.findMany({
      where: { status: "completed" },
      select: { 
        kpiScore: true,
        startedAt: true,
        completedAt: true
      }
    })
  ])

  // Calculate pass rate (KPI >= 80)
  const passedCount = allSessions.filter(s => (s.kpiScore || 0) >= 80).length
  const passRate = completedSessions > 0 ? (passedCount / completedSessions) * 100 : 0

  // Calculate average duration in minutes
  let totalDurationMinutes = 0
  let durationCount = 0
  
  allSessions.forEach(s => {
    if (s.startedAt && s.completedAt) {
      const durationMs = s.completedAt.getTime() - s.startedAt.getTime()
      totalDurationMinutes += durationMs / (1000 * 60)
      durationCount++
    }
  })
  
  const avgDuration = durationCount > 0 ? totalDurationMinutes / durationCount : 0

  const stats = {
    totalEmployees,
    totalTests,
    completedSessions,
    avgScore: avgScore._avg.kpiScore || 0,
    passRate,
    avgDuration
  }

  // Cache for 60 seconds
  await redis.set("dashboard:stats", stats, { ex: 60 })

  return stats
}

export async function getChartData() {
  const cached = await redis.get("dashboard:chart")
  if (cached) return JSON.parse(cached)

  // Get average score per test
  const testStats = await prisma.employeeTestSession.groupBy({
    by: ['testId'],
    where: { status: 'completed' },
    _avg: {
      kpiScore: true
    },
    _count: {
      id: true
    }
  })

  // Get test names
  const tests = await prisma.test.findMany({
    where: {
      id: { in: testStats.map(s => s.testId) }
    },
    select: { id: true, title: true }
  })

  const testMap = new Map(tests.map(t => [t.id, t.title]))

  const chartData = testStats.map(stat => ({
    name: testMap.get(stat.testId) || 'Unknown',
    score: Math.round(stat._avg.kpiScore || 0),
    count: stat._count.id
  })).sort((a, b) => b.score - a.score) // Sort by score desc

  await redis.set("dashboard:chart", chartData, { ex: 60 })

  return chartData
}

export async function getLeaderboard() {
  const cached = await redis.get("leaderboard")
  if (cached) return JSON.parse(cached)

  const leaderboard = await prisma.employeeTestSession.findMany({
    where: { status: "completed" },
    orderBy: { kpiScore: "desc" },
    take: 10,
    include: {
      employee: true,
      test: true
    }
  })

  await redis.set("leaderboard", leaderboard, { ex: 60 })

  return leaderboard
}
