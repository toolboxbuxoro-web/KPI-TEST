'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Calendar, Edit2, Loader2, CheckCircle2, XCircle, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

import { AttendanceEditDialog } from './attendance-edit-dialog'
import { AuditHistoryPopover } from './audit-history-popover'
import { AttendanceFilters } from './attendance-filters'
import { type AttendanceRecordWithEmployee } from '@/app/actions/attendance-admin'

interface StoreOption {
  id: string
  name: string
}

interface AttendanceTableProps {
  records: AttendanceRecordWithEmployee[]
  stores: StoreOption[]
  fromDate: string
  toDate: string
  storeId?: string
}

export function AttendanceTable({
  records: initialRecords,
  stores,
  fromDate,
  toDate,
  storeId
}: AttendanceTableProps) {
  const router = useRouter()
  const [records, setRecords] = useState(initialRecords)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecordWithEmployee | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleEditComplete = () => {
    setEditingRecord(null)
    // Refresh to get updated data
    startTransition(() => {
      router.refresh()
    })
  }

  const formatTime = (date: Date | null) => {
    if (!date) return '—'
    return format(new Date(date), 'HH:mm', { locale: ru })
  }

  // Format display date range
  const formatDateRange = () => {
    const from = new Date(fromDate)
    const to = new Date(toDate)
    
    if (fromDate === toDate) {
      return format(from, 'dd MMMM yyyy', { locale: ru })
    }
    
    return `${format(from, 'dd MMM', { locale: ru })} — ${format(to, 'dd MMM yyyy', { locale: ru })}`
  }

  return (
    <>
      <Card className="neo-card neo-float">
        <CardHeader className="pb-4 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Calendar className="h-5 w-5 text-primary" />
                  Записи посещаемости
                </CardTitle>
                <CardDescription>
                  Просмотр и редактирование отметок
                </CardDescription>
              </div>
            </div>
            
            {/* Filters */}
            <AttendanceFilters
              stores={stores}
              currentStoreId={storeId}
              currentFromDate={fromDate}
              currentToDate={toDate}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-24rem)]">
            {isPending ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Calendar className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Нет записей</p>
                <p className="text-sm">За выбранный период записей не найдено</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-muted/50 border-white/10">
                    <TableHead className="w-64">Сотрудник</TableHead>
                    <TableHead>Магазин</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-center">Вход</TableHead>
                    <TableHead className="text-center">Выход</TableHead>
                    <TableHead className="text-center">В зоне</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} className="group hover:bg-muted/50 border-white/10">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                            <AvatarImage src={record.employee.imageUrl || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {record.employee.firstName[0]}{record.employee.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {record.employee.firstName} {record.employee.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {record.employee.position}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.store ? (
                          <Badge variant="outline" className="neo-badge">
                            <MapPin className="h-3 w-3 mr-1" />
                            {record.store.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(record.checkIn), 'dd.MM.yyyy', { locale: ru })}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-200 dark:border-green-900 backdrop-blur-sm">
                          {formatTime(record.checkIn)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {record.checkOut ? (
                          <Badge variant="outline" className="bg-orange-500/5 text-orange-600 border-orange-200 dark:border-orange-900 backdrop-blur-sm">
                            {formatTime(record.checkOut)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {record.inZone ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <AuditHistoryPopover recordId={record.id} />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => setEditingRecord(record)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
          
          {/* Footer */}
          <div className="border-t bg-muted/20 px-6 py-3">
            <p className="text-sm text-muted-foreground">
              Всего записей: <span className="font-medium text-foreground">{records.length}</span>
              {' • '}
              Период: <span className="font-medium text-foreground">{formatDateRange()}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <AttendanceEditDialog
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleEditComplete}
      />
    </>
  )
}
