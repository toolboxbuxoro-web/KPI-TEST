'use client'

import { useState, useEffect, useMemo } from 'react'
import { getEmployeeAttendanceHistory } from '@/app/actions/attendance'
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  Loader2, 
  Clock, 
  Calendar as CalendarIcon, 
  Timer, 
  Store, 
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  LogIn,
  LogOut,
  TrendingUp
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface AttendanceHistoryProps {
  employeeId: string
}

export function AttendanceHistory({ employeeId }: AttendanceHistoryProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [records, setRecords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [calendarOpen, setCalendarOpen] = useState(false)

  const loadHistory = async (targetDate: Date) => {
    setIsLoading(true)
    try {
      const data = await getEmployeeAttendanceHistory(
        employeeId, 
        targetDate.getMonth(), 
        targetDate.getFullYear()
      )
      setRecords(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory(date)
  }, [date])

  // Group records by day with status info
  const daysWithAttendance = useMemo(() => {
    return records.reduce((acc, record) => {
      const day = new Date(record.checkIn).toDateString()
      if (!acc[day]) {
        acc[day] = { records: [], hasEntry: true, hasExit: true, totalMs: 0 }
      }
      acc[day].records.push(record)
      if (!record.checkOut) {
        acc[day].hasExit = false
      } else {
        // Calculate worked time
        const checkIn = new Date(record.checkIn)
        const checkOut = new Date(record.checkOut)
        acc[day].totalMs += checkOut.getTime() - checkIn.getTime()
      }
      return acc
    }, {} as Record<string, { records: any[], hasEntry: boolean, hasExit: boolean, totalMs: number }>)
  }, [records])

  // Day records for selected day
  const dayRecords = useMemo(() => {
    const dayStr = selectedDay.toDateString()
    return daysWithAttendance[dayStr]?.records || []
  }, [selectedDay, daysWithAttendance])

  // Day status helper
  const getDayStatus = (day: Date) => {
    const dayStr = day.toDateString()
    const dayData = daysWithAttendance[dayStr]
    if (!dayData) return 'none'
    if (!dayData.hasExit) return 'incomplete'
    return 'complete'
  }

  // Navigate days
  const goToPrevDay = () => {
    const prev = new Date(selectedDay)
    prev.setDate(prev.getDate() - 1)
    setSelectedDay(prev)
    // Check if need to load new month
    if (prev.getMonth() !== date.getMonth()) {
      setDate(prev)
    }
  }

  const goToNextDay = () => {
    const next = new Date(selectedDay)
    next.setDate(next.getDate() + 1)
    if (next <= new Date()) {
      setSelectedDay(next)
      if (next.getMonth() !== date.getMonth()) {
        setDate(next)
      }
    }
  }

  const goToToday = () => {
    const today = new Date()
    setSelectedDay(today)
    setDate(today)
  }

  // Calculate total worked time for selected day
  const totalWorkedTime = useMemo(() => {
    let totalMs = 0
    dayRecords.forEach((record: any) => {
      if (!record.checkOut) return
      const checkIn = new Date(record.checkIn)
      const checkOut = new Date(record.checkOut)
      totalMs += checkOut.getTime() - checkIn.getTime()
    })
    const hours = Math.floor(totalMs / (1000 * 60 * 60))
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60))
    return { hours, minutes, totalMs }
  }, [dayRecords])

  // Month stats
  const monthStats = useMemo(() => {
    let totalDays = 0
    let totalMs = 0
    let incompleteDays = 0
    
    Object.values(daysWithAttendance).forEach((day: any) => {
      totalDays++
      totalMs += day.totalMs
      if (!day.hasExit) incompleteDays++
    })

    const avgHours = totalDays > 0 ? Math.round(totalMs / totalDays / (1000 * 60 * 60) * 10) / 10 : 0
    
    return { totalDays, avgHours, incompleteDays }
  }, [daysWithAttendance])

  const isToday = selectedDay.toDateString() === new Date().toDateString()
  const isFuture = selectedDay > new Date()

  return (
    <div className="space-y-4">
      {/* Header with Date Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Date Navigation */}
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={goToPrevDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "min-w-[180px] justify-start text-left font-medium",
                  isToday && "border-primary/50 bg-primary/5"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {selectedDay.toLocaleDateString('ru-RU', { 
                  day: 'numeric', 
                  month: 'short',
                  year: selectedDay.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                })}
                {isToday && (
                  <Badge variant="secondary" className="ml-2 text-xs">Сегодня</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-2 border-b flex items-center gap-2">
                <Select 
                  value={date.getMonth().toString()} 
                  onValueChange={(v) => {
                    const newDate = new Date(date)
                    newDate.setMonth(parseInt(v))
                    setDate(newDate)
                  }}
                >
                  <SelectTrigger className="w-[120px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 12}, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {new Date(0, i).toLocaleString('ru', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={date.getFullYear().toString()} 
                  onValueChange={(v) => {
                    const newDate = new Date(date)
                    newDate.setFullYear(parseInt(v))
                    setDate(newDate)
                  }}
                >
                  <SelectTrigger className="w-[80px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={(day) => {
                  if (day) {
                    setSelectedDay(day)
                    setCalendarOpen(false)
                  }
                }}
                month={date}
                onMonthChange={setDate}
                modifiers={{
                  complete: (d) => getDayStatus(d) === 'complete',
                  incomplete: (d) => getDayStatus(d) === 'incomplete'
                }}
                modifiersStyles={{
                  complete: { 
                    fontWeight: 'bold', 
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    color: 'rgb(22, 163, 74)',
                    borderRadius: '50%'
                  },
                  incomplete: { 
                    fontWeight: 'bold', 
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    color: 'rgb(217, 119, 6)',
                    borderRadius: '50%'
                  }
                }}
              />
              <div className="p-2 border-t flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> Полный
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Без выхода
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => {
                    goToToday()
                    setCalendarOpen(false)
                  }}
                >
                  Сегодня
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={goToNextDay}
            disabled={isFuture || isToday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Month Stats - Compact */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{monthStats.totalDays}</span>
            <span>дней</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">~{monthStats.avgHours}ч</span>
            <span>/день</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : dayRecords.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Clock className="h-10 w-10 opacity-20 mb-3" />
          <p className="text-sm">Нет записей за {selectedDay.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>
        </div>
      ) : (
        /* Records List */
        <div className="space-y-3">
          {/* Summary Row */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Отработано:</span>
            </div>
            <span className="text-lg font-bold text-primary">
              {totalWorkedTime.hours}ч {totalWorkedTime.minutes}м
            </span>
          </div>

          {/* Records Table/List */}
          <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_80px_80px] sm:grid-cols-[1fr_100px_100px_100px] bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <div>Магазин</div>
              <div className="text-center">Вход</div>
              <div className="text-center">Выход</div>
              <div className="text-right">Время</div>
            </div>
            
            {/* Rows */}
            <ScrollArea className="max-h-[300px]">
              {dayRecords.map((record: any, index: number) => {
                const checkIn = new Date(record.checkIn)
                const checkOut = record.checkOut ? new Date(record.checkOut) : null
                
                // Calculate duration
                let duration = ''
                if (checkOut) {
                  const diffMs = checkOut.getTime() - checkIn.getTime()
                  const hours = Math.floor(diffMs / (1000 * 60 * 60))
                  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
                  duration = `${hours}ч ${minutes}м`
                }

                return (
                  <div 
                    key={record.id}
                    className={cn(
                      "grid grid-cols-[1fr_80px_80px_80px] sm:grid-cols-[1fr_100px_100px_100px] px-3 py-2.5 items-center",
                      index !== dayRecords.length - 1 && "border-b",
                      !checkOut && "bg-amber-50 dark:bg-amber-950/20"
                    )}
                  >
                    {/* Store */}
                    <div className="flex items-center gap-2 min-w-0">
                      <Store className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">
                        {record.store?.name || record.branch || "—"}
                      </span>
                    </div>
                    
                    {/* Check In */}
                    <div className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                        <LogIn className="h-3 w-3" />
                        {checkIn.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    {/* Check Out */}
                    <div className="text-center">
                      {checkOut ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400">
                          <LogOut className="h-3 w-3" />
                          {checkOut.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-900/30 border-amber-300">
                          Активно
                        </Badge>
                      )}
                    </div>
                    
                    {/* Duration */}
                    <div className="text-right">
                      {duration ? (
                        <span className="text-sm font-medium">{duration}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  )
}
