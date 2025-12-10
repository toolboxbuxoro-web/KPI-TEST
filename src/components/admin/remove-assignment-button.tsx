'use client'

import { useState } from "react"
import { removeAssignment } from "@/app/actions/assignment"
import { UserX } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface RemoveAssignmentButtonProps {
  testId: string
  testTitle: string
  employeeId: string
  employeeName: string
}

export function RemoveAssignmentButton({ 
  testId, 
  testTitle, 
  employeeId, 
  employeeName 
}: RemoveAssignmentButtonProps) {
  const [open, setOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await removeAssignment(testId, employeeId)
      toast.success("Назначение отменено")
      setOpen(false)
    } catch (error) {
      toast.error("Ошибка при отмене назначения")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <>
      <button 
        type="button"
        onClick={() => setOpen(true)} 
        className="hover:text-destructive ml-2"
      >
        <UserX className="h-3 w-3" />
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <UserX className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl">Отменить назначение?</AlertDialogTitle>
              </div>
            </div>
            <div className="space-y-3">
              <AlertDialogDescription className="text-base leading-relaxed">
                Вы действительно хотите отменить назначение теста для сотрудника?
              </AlertDialogDescription>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">📝 Тест:</span>
                  <span className="text-sm text-blue-800 dark:text-blue-200 font-semibold">{testTitle}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">👤 Сотрудник:</span>
                  <span className="text-sm text-blue-800 dark:text-blue-200 font-semibold">{employeeName}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Сотрудник больше не увидит этот тест в списке доступных (если система назначений активна).
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemove} 
              disabled={removing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {removing ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                  Удаление...
                </>
              ) : (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Отменить назначение
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

