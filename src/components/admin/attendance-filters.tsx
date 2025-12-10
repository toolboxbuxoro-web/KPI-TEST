'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Calendar as CalendarIcon, Store, X, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface StoreOption {
  id: string
  name: string
}

interface AttendanceFiltersProps {
  stores: StoreOption[]
  currentStoreId?: string
  currentFromDate?: string
  currentToDate?: string
}

export function AttendanceFilters({
  stores,
  currentStoreId,
  currentFromDate,
  currentToDate
}: AttendanceFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const fromDate = currentFromDate ? new Date(currentFromDate) : new Date()
  const toDate = currentToDate ? new Date(currentToDate) : new Date()

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    router.push(`${pathname}?${params.toString()}`)
  }

  const handleStoreChange = (value: string) => {
    updateParams({ storeId: value === 'all' ? undefined : value })
  }

  const handleFromDateChange = (date: Date | undefined) => {
    if (date) {
      updateParams({ from: format(date, 'yyyy-MM-dd') })
    }
  }

  const handleToDateChange = (date: Date | undefined) => {
    if (date) {
      updateParams({ to: format(date, 'yyyy-MM-dd') })
    }
  }

  const handleReset = () => {
    router.push(pathname)
  }

  const hasFilters = currentStoreId || currentFromDate || currentToDate

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Store Filter */}
      <Select value={currentStoreId || 'all'} onValueChange={handleStoreChange}>
        <SelectTrigger className="w-48 neo-input">
          <Store className="h-4 w-4 mr-2 text-muted-foreground" />
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

      {/* From Date Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-40 justify-start text-left font-normal neo-input",
              !currentFromDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {currentFromDate ? format(fromDate, 'dd.MM.yyyy') : 'От'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 neo-card" align="start">
          <Calendar
            mode="single"
            selected={fromDate}
            onSelect={handleFromDateChange}
            locale={ru}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* To Date Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-40 justify-start text-left font-normal neo-input",
              !currentToDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {currentToDate ? format(toDate, 'dd.MM.yyyy') : 'До'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 neo-card" align="start">
          <Calendar
            mode="single"
            selected={toDate}
            onSelect={handleToDateChange}
            locale={ru}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Reset Button */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-muted-foreground hover:text-foreground gap-1.5"
        >
          <RotateCcw className="h-4 w-4" />
          Сбросить
        </Button>
      )}
    </div>
  )
}
