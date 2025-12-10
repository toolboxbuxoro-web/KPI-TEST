'use client'

import { useState, useEffect } from 'react'
import { Download, CalendarIcon, Building2, Users, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

import { getAllStores } from '@/app/actions/store'

interface Store {
  id: string
  name: string
}

interface Employee {
  id: string
  firstName: string
  lastName: string
}

export function AttendanceExportDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  
  // Filter state
  const [storeId, setStoreId] = useState<string>('')
  const [employeeId, setEmployeeId] = useState<string>('')
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

  // Load stores and employees when dialog opens
  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      const storesData = await getAllStores()
      setStores(storesData)

      // Fetch employees
      const res = await fetch('/api/employees')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error('Failed to load filter data:', error)
    }
  }

  const handleExport = () => {
    setLoading(true)
    
    // Build query params
    const params = new URLSearchParams()
    if (storeId && storeId !== 'all') params.append('storeId', storeId)
    if (employeeId && employeeId !== 'all') params.append('employeeId', employeeId)
    if (startDate) params.append('startDate', startDate.toISOString().split('T')[0])
    if (endDate) params.append('endDate', endDate.toISOString().split('T')[0])

    const url = `/api/export/attendance${params.toString() ? `?${params.toString()}` : ''}`
    
    // Trigger download
    window.location.href = url
    
    setTimeout(() => {
      setLoading(false)
      setOpen(false)
    }, 1000)
  }

  const resetFilters = () => {
    setStoreId('')
    setEmployeeId('')
    setStartDate(undefined)
    setEndDate(undefined)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 neo-float">
          <Download className="h-4 w-4" />
          Экспорт CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] neo-card border-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Download className="h-5 w-5 text-primary" />
            Экспорт посещаемости
          </DialogTitle>
          <DialogDescription>
            Выберите фильтры для экспорта данных посещаемости в CSV формат
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                Начало периода
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal neo-input',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    {startDate ? (
                      format(startDate, 'dd.MM.yyyy', { locale: ru })
                    ) : (
                      <span>Выберите дату</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={ru}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                Конец периода
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal neo-input',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    {endDate ? (
                      format(endDate, 'dd.MM.yyyy', { locale: ru })
                    ) : (
                      <span>Выберите дату</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={ru}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Store Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Магазин
            </Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger className="neo-input">
                <SelectValue placeholder="Все магазины" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все магазины</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Сотрудник
            </Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="neo-input">
                <SelectValue placeholder="Все сотрудники" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все сотрудники</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="sm:mr-auto"
          >
            Сбросить фильтры
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading}
            className="neo-gradient text-primary-foreground gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Скачать CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
