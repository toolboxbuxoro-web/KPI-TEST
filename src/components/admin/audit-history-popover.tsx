'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { History, Loader2, ArrowRight, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

import { getRecordAuditLogs } from '@/app/actions/attendance-admin'

interface AuditLog {
  id: string
  userId: string | null
  action: string
  previousValue: any
  newValue: any
  createdAt: Date
  details: string | null
}

interface AuditHistoryPopoverProps {
  recordId: string
}

export function AuditHistoryPopover({ recordId }: AuditHistoryPopoverProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadLogs()
    }
  }, [isOpen, recordId])

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const data = await getRecordAuditLogs(recordId)
      setLogs(data)
    } catch (error) {
      console.error('Failed to load audit logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '—'
    return format(new Date(isoString), 'HH:mm', { locale: ru })
  }

  const formatDateTime = (date: Date) => {
    return format(new Date(date), 'dd MMM yyyy, HH:mm:ss', { locale: ru })
  }

  const renderChange = (label: string, prev: any, next: any) => {
    if (prev === next) return null
    
    const formatValue = (val: any) => {
      if (val === null || val === undefined) return '—'
      if (typeof val === 'boolean') return val ? 'Да' : 'Нет'
      if (typeof val === 'string' && val.includes('T')) {
        return formatTime(val)
      }
      return String(val)
    }

    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground w-16">{label}:</span>
        <span className="text-red-500/80 line-through">{formatValue(prev)}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="text-green-600 font-medium">{formatValue(next)}</span>
      </div>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
        >
          <History className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 neo-card" 
        align="end"
        sideOffset={8}
      >
        <div className="px-4 py-3 border-b bg-muted/30">
          <h4 className="font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            История изменений
          </h4>
        </div>
        
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Изменений нет</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {logs.map((log, index) => (
                <div key={log.id}>
                  <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{log.userId || 'Система'}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {renderChange('Вход', log.previousValue?.checkIn, log.newValue?.checkIn)}
                      {renderChange('Выход', log.previousValue?.checkOut, log.newValue?.checkOut)}
                      {renderChange('В зоне', log.previousValue?.inZone, log.newValue?.inZone)}
                    </div>
                  </div>
                  {index < logs.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
