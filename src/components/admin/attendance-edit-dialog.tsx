'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Loader2, Save, Clock } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { 
  updateAttendanceRecord,
  type AttendanceRecordWithEmployee,
  type AttendanceUpdateData 
} from '@/app/actions/attendance-admin'

interface AttendanceEditDialogProps {
  record: AttendanceRecordWithEmployee | null
  onClose: () => void
  onSave: () => void
}

export function AttendanceEditDialog({ record, onClose, onSave }: AttendanceEditDialogProps) {
  const [isPending, startTransition] = useTransition()
  
  // Form state
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [inZone, setInZone] = useState(true)

  // Reset form when record changes
  const resetForm = () => {
    if (record) {
      setCheckIn(format(new Date(record.checkIn), "yyyy-MM-dd'T'HH:mm"))
      setCheckOut(record.checkOut 
        ? format(new Date(record.checkOut), "yyyy-MM-dd'T'HH:mm")
        : ''
      )
      setInZone(record.inZone)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      resetForm()
    } else {
      onClose()
    }
  }

  const handleSave = () => {
    if (!record) return

    startTransition(async () => {
      try {
        const data: AttendanceUpdateData = {
          checkIn: new Date(checkIn),
          checkOut: checkOut ? new Date(checkOut) : null,
          inZone
        }

        const result = await updateAttendanceRecord(record.id, data)

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Запись обновлена')
        onSave()
      } catch (error) {
        console.error('Failed to update record:', error)
        toast.error('Ошибка при сохранении')
      }
    })
  }

  return (
    <Dialog open={!!record} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md neo-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Редактирование записи
          </DialogTitle>
          {record && (
            <DialogDescription>
              {record.employee.firstName} {record.employee.lastName} • {record.employee.position}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Check In */}
          <div className="space-y-2">
            <Label htmlFor="checkIn" className="text-sm font-medium">
              Время входа
            </Label>
            <Input
              id="checkIn"
              type="datetime-local"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="neo-input"
            />
          </div>

          {/* Check Out */}
          <div className="space-y-2">
            <Label htmlFor="checkOut" className="text-sm font-medium">
              Время выхода <span className="text-muted-foreground">(опционально)</span>
            </Label>
            <Input
              id="checkOut"
              type="datetime-local"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="neo-input"
            />
          </div>

          {/* In Zone */}
          <div className="flex items-center space-x-3 py-2">
            <Checkbox
              id="inZone"
              checked={inZone}
              onCheckedChange={(checked) => setInZone(checked === true)}
            />
            <Label htmlFor="inZone" className="text-sm font-medium cursor-pointer">
              В рабочей зоне (геолокация подтверждена)
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isPending} className="neo-gradient">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Сохранить
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
