'use client'

import { useState, useEffect, useMemo } from 'react'
import { getEmployeeAttendanceHistory } from '@/app/actions/attendance'
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, Clock, ArrowRight, Calendar as CalendarIcon, Timer, Store, AlertCircle, CheckCircle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface AttendanceHistoryProps {
  employeeId: string
}

export function AttendanceHistory({ employeeId }: AttendanceHistoryProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [records, setRecords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date())
  const [dayRecords, setDayRecords] = useState<any[]>([])

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
        acc[day] = { records: [], hasEntry: true, hasExit: true }
      }
      acc[day].records.push(record)
      if (!record.checkOut) {
        acc[day].hasExit = false
      }
      return acc
    }, {} as Record<string, { records: any[], hasEntry: boolean, hasExit: boolean }>)
  }, [records])

  useEffect(() => {
    if (selectedDay) {
        const dayStr = selectedDay.toDateString()
        setDayRecords(daysWithAttendance[dayStr]?.records || [])
    }
  }, [selectedDay, daysWithAttendance])

  const handleDayClick = (day: Date | undefined) => {
    if (!day) return
    setSelectedDay(day)
  }

  // Day status helper
  const getDayStatus = (day: Date) => {
    const dayStr = day.toDateString()
    const dayData = daysWithAttendance[dayStr]
    if (!dayData) return 'none' // No entry
    if (!dayData.hasExit) return 'incomplete' // Has entry but no exit
    return 'complete' // Has both entry and exit
  }

  return (
    <div className="flex flex-col xl:flex-row gap-8 h-[600px]">
      {/* Left: Calendar & Filters */}
      <div className="w-full xl:w-auto flex flex-col gap-4">
        <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-lg border">
            <Select 
                value={date.getMonth().toString()} 
                onValueChange={(v) => {
                    const newDate = new Date(date)
                    newDate.setMonth(parseInt(v))
                    setDate(newDate)
                }}
            >
                <SelectTrigger className="w-[140px] border-0 bg-transparent focus:ring-0">
                    <SelectValue placeholder="Месяц" />
                </SelectTrigger>
                <SelectContent>
                    {Array.from({length: 12}, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                            {new Date(0, i).toLocaleString('ru', { month: 'long' })}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6" />

            <Select 
                value={date.getFullYear().toString()} 
                onValueChange={(v) => {
                    const newDate = new Date(date)
                    newDate.setFullYear(parseInt(v))
                    setDate(newDate)
                }}
            >
                <SelectTrigger className="w-[100px] border-0 bg-transparent focus:ring-0">
                    <SelectValue placeholder="Год" />
                </SelectTrigger>
                <SelectContent>
                    {[2024, 2025, 2026].map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className="border rounded-xl p-4 shadow-sm bg-card">
            <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={handleDayClick}
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
                className="rounded-md"
            />
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground justify-center">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Полный день</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>Нет выхода</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                    <span>Нет входа</span>
                </div>
            </div>
        </div>
      </div>

      {/* Right: Details */}
      <div className="flex-1 flex flex-col min-h-0 border rounded-xl bg-muted/10 overflow-hidden">
        {!selectedDay ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
                <CalendarIcon className="h-12 w-12 opacity-20" />
                <p>Выберите день чтобы увидеть детали</p>
            </div>
        ) : (
            <div className="flex flex-col h-full">
                <div className="p-6 border-b bg-card">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                        {selectedDay.toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                </div>

                <ScrollArea className="flex-1 p-6">
                    {dayRecords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                            <Clock className="h-10 w-10 opacity-20" />
                            <p>Нет записей за этот день</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Card */}
                            <div className="bg-gradient-to-br from-primary/10 to-transparent p-6 rounded-2xl border border-primary/10">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/20 rounded-lg">
                                            <Timer className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Рабочее время</p>
                                            <p className="text-xs text-muted-foreground">(08:00 - 18:00)</p>
                                        </div>
                                    </div>
                                    <span className="text-3xl font-bold text-primary tracking-tight">
                                        {(() => {
                                            let totalMilliseconds = 0
                                            dayRecords.forEach(record => {
                                                if (!record.checkOut) return

                                                const checkIn = new Date(record.checkIn)
                                                const checkOut = new Date(record.checkOut)
                                                
                                                const workStart = new Date(checkIn)
                                                workStart.setHours(8, 0, 0, 0)
                                                
                                                const workEnd = new Date(checkIn)
                                                workEnd.setHours(18, 0, 0, 0)

                                                const effectiveCheckIn = checkIn < workStart ? workStart : checkIn
                                                const effectiveCheckOut = checkOut > workEnd ? workEnd : checkOut

                                                if (effectiveCheckIn < effectiveCheckOut) {
                                                    totalMilliseconds += effectiveCheckOut.getTime() - effectiveCheckIn.getTime()
                                                }
                                            })

                                            const hours = Math.floor(totalMilliseconds / (1000 * 60 * 60))
                                            const minutes = Math.floor((totalMilliseconds % (1000 * 60 * 60)) / (1000 * 60))
                                            
                                            return `${hours}ч ${minutes}м`
                                        })()}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Хронология событий</h4>
                                {dayRecords.map((record, index) => (
                                    <div key={record.id} className="relative pl-8 pb-8 last:pb-0">
                                        {/* Timeline Line */}
                                        {index !== dayRecords.length - 1 && (
                                            <div className="absolute left-[11px] top-8 bottom-0 w-[2px] bg-border" />
                                        )}
                                        
                                        {/* Timeline Dot */}
                                        <div className="absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-background bg-primary shadow-sm z-10" />

                                        <div className="bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between mb-4">
                                                <Badge variant="outline" className="flex items-center gap-1.5 py-1 px-3 bg-muted/50">
                                                    <Store className="h-3.5 w-3.5" />
                                                    {record.store?.name || record.branch || "Не указано"}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground font-mono">ID: {record.id.slice(-4)}</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground font-medium uppercase">Вход</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                                            {new Date(record.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-1 text-right">
                                                    <span className="text-xs text-muted-foreground font-medium uppercase">Выход</span>
                                                    <div className="flex items-center justify-end gap-2">
                                                        {record.checkOut ? (
                                                            <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                                                {new Date(record.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm italic text-muted-foreground py-1">Активная сессия</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </ScrollArea>
            </div>
        )}
      </div>
    </div>
  )
}
