'use client'

import { useState, useEffect, useMemo } from 'react'
import { Clock, Trophy, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getAllTodayAttendance } from '@/app/actions/attendance'

interface TodayActivityListProps {
  storeId?: string
  onBack: () => void
}

export function TodayActivityList({ storeId, onBack }: TodayActivityListProps) {
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      const logs = await getAllTodayAttendance(storeId || undefined)
      setRecentLogs(logs)
    } catch (error) {
      console.error("Failed to fetch logs", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 30000)
    return () => clearInterval(interval)
  }, [storeId])

  // Calculate Top 3 Early Birds
  const earlyBirds = useMemo(() => {
    const checkedInEmployees = new Map()
    
    recentLogs.forEach(log => {
      if (log.checkIn && !checkedInEmployees.has(log.employee.id)) {
         checkedInEmployees.set(log.employee.id, log)
      }
    })

    return Array.from(checkedInEmployees.values())
      .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
      .slice(0, 3)
  }, [recentLogs])

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      {/* Header with back button */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Активность за сегодня
            </h1>
            <p className="text-sm text-muted-foreground">
              Последние действия сотрудников
            </p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={fetchLogs} className="h-10 w-10 rounded-full">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Early Birds Section - Fixed */}
      {earlyBirds.length > 0 && (
        <div className="p-4 border-b shrink-0 bg-card/30">
          <div className="bg-gradient-to-br from-yellow-500/10 to-transparent p-4 rounded-xl border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold text-yellow-600 dark:text-yellow-400">Ранние пташки</h3>
            </div>
            <div className="flex justify-around items-end gap-2">
              {/* 2nd Place */}
              {earlyBirds[1] && (
                <div className="flex flex-col items-center gap-1 group">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-slate-300 shadow-md">
                      <AvatarImage src={earlyBirds[1].employee.imageUrl} />
                      <AvatarFallback>{earlyBirds[1].employee.firstName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-1 bg-slate-300 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white">
                      #2
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold truncate max-w-[80px]">{earlyBirds[1].employee.firstName}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(earlyBirds[1].checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {earlyBirds[0] && (
                <div className="flex flex-col items-center gap-1 -mt-4 group relative z-10">
                  <div className="relative">
                    <div className="absolute -top-6 left-0 right-0 flex justify-center text-yellow-500 animate-bounce">
                      <Trophy className="h-6 w-6 fill-yellow-500" />
                    </div>
                    <Avatar className="h-16 w-16 border-4 border-yellow-400 shadow-xl bg-background">
                      <AvatarImage src={earlyBirds[0].employee.imageUrl} />
                      <AvatarFallback className="text-xl bg-yellow-100 text-yellow-700">{earlyBirds[0].employee.firstName[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="text-center mt-1">
                    <p className="text-sm font-bold truncate max-w-[100px] text-yellow-600 dark:text-yellow-400">{earlyBirds[0].employee.firstName}</p>
                    <Badge variant="outline" className="text-[10px] bg-yellow-500/10 border-yellow-500/20 text-yellow-600">
                      {new Date(earlyBirds[0].checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Badge>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {earlyBirds[2] && (
                <div className="flex flex-col items-center gap-1 group">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-orange-300 shadow-md">
                      <AvatarImage src={earlyBirds[2].employee.imageUrl} />
                      <AvatarFallback>{earlyBirds[2].employee.firstName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -left-1 bg-orange-300 text-orange-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white">
                      #3
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold truncate max-w-[80px]">{earlyBirds[2].employee.firstName}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(earlyBirds[2].checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity List Header */}
      <div className="px-4 py-3 border-b bg-muted/20 flex items-center justify-between shrink-0">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Clock className="h-3 w-3" />
          Все записи
        </h4>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-background/50">{recentLogs.length}</Badge>
      </div>

      {/* Scrollable Activity List */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/10">
        <div className="p-4 space-y-3">
          {isLoading && recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin opacity-50" />
              <p>Загрузка...</p>
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
              <div className="bg-muted rounded-full p-4">
                <Clock className="h-8 w-8 opacity-50" />
              </div>
              <p>Записей пока нет</p>
            </div>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="group flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 hover:shadow-md transition-all duration-200">
                <Avatar className="h-12 w-12 border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
                  <AvatarImage src={log.employee.imageUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {log.employee.firstName[0]}{log.employee.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold truncate">
                      {log.employee.firstName} {log.employee.lastName}
                    </p>
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(log.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 truncate">{log.employee.position}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-200 dark:border-green-900">
                      Вход: {new Date(log.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Badge>
                    {log.checkOut && (
                      <Badge variant="outline" className="bg-orange-500/5 text-orange-600 border-orange-200 dark:border-orange-900">
                        Выход: {new Date(log.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/20 p-4 shrink-0">
        <div className="w-full flex justify-between text-xs text-muted-foreground">
          <span>Всего записей: {recentLogs.length}</span>
          <span>Обновлено: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  )
}
