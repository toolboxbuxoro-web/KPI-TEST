'use client'

import { useState } from "react"
import { deleteTest } from "@/app/actions/test"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
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

interface DeleteTestButtonProps {
  testId: string
  testTitle: string
}

export function DeleteTestButton({ testId, testTitle }: DeleteTestButtonProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteTest(testId)
      toast.success("Тест удален")
      setOpen(false)
    } catch (error) {
      toast.error("Ошибка удаления")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Button 
        variant="destructive" 
        size="icon" 
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl">Удалить тест?</AlertDialogTitle>
              </div>
            </div>
            <div className="space-y-3">
              <AlertDialogDescription className="text-base leading-relaxed">
                Вы действительно хотите удалить тест{" "}
                <span className="font-semibold text-foreground">"{testTitle}"</span>?
              </AlertDialogDescription>
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
                <div className="text-sm text-red-800 dark:text-red-200 font-medium">
                  ⚠️ Это действие нельзя отменить
                </div>
                <ul className="mt-2 text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                  <li>Все вопросы будут удалены</li>
                  <li>Результаты тестов будут потеряны</li>
                  <li>Назначения будут отменены</li>
                </ul>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                  Удаление...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить тест
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

