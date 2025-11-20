'use server'

import prisma from "@/lib/db"
import { redis } from "@/lib/redis"

interface DashboardStats {
  totalEmployees: number
  totalTests: number
  completedSessions: number
  avgScore: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Try cache
  const cached = await redis.get<DashboardStats>("dashboard:stats")
  if (cached) return cached

  const [totalEmployees, totalTests, completedSessions, avgScore] = await Promise.all([
    prisma.employee.count(),
    prisma.test.count(),
    prisma.employeeTestSession.count({ where: { status: "completed" } }),
    prisma.employeeTestSession.aggregate({
      _avg: { kpiScore: true },
      where: { status: "completed" }
    })
  ])

  const stats = {
    totalEmployees,
    totalTests,
    completedSessions,
    avgScore: avgScore._avg.kpiScore || 0
  }

  // Cache for 60 seconds
  await redis.set("dashboard:stats", stats, { ex: 60 })

  return stats
}

export async function getLeaderboard() {
  const cached = await redis.get<any[]>("leaderboard")
  if (cached) return cached

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
