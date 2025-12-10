'use client'

import { useState } from "react"
import { assignTest } from "@/app/actions/assignment"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { UserPlus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface Employee {
  id: string
  firstName: string
  lastName: string
  position: string
}

interface AssignTestDialogProps {
  testId: string
  testTitle: string
  employees: Employee[]
  assignedEmployeeIds?: string[]
}

export function AssignTestDialog({ testId, testTitle, employees, assignedEmployeeIds = [] }: AssignTestDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleToggle = (employeeId: string) => {
    setSelectedIds(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error("Выберите хотя бы одного сотрудника")
      return
    }

    setLoading(true)
    try {
      const result = await assignTest(testId, selectedIds, "admin") // TODO: Get actual admin ID
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Тест назначен ${result.count} сотрудникам`)
        setOpen(false)
        setSelectedIds([])
        router.refresh()
      }
    } catch (error) {
      toast.error("Ошибка при назначении теста")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Назначить
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Назначить тест</DialogTitle>
          <DialogDescription>
            Выберите сотрудников для теста "{testTitle}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет доступных сотрудников
            </p>
          ) : (
            employees.map(employee => {
              const isAssigned = assignedEmployeeIds.includes(employee.id)
              return (
                <div
                  key={employee.id}
                  className="flex items-start space-x-3 p-3 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Checkbox
                    id={employee.id}
                    checked={selectedIds.includes(employee.id)}
                    onCheckedChange={() => handleToggle(employee.id)}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={employee.id}
                      className="font-medium cursor-pointer"
                    >
                      {employee.firstName} {employee.lastName}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {employee.position}
                      {isAssigned && " • Уже назначен"}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={loading || selectedIds.length === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Назначить ({selectedIds.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
