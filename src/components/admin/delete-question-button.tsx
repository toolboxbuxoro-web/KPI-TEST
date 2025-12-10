'use client'

import { useState } from "react"
import { deleteQuestion } from "@/app/actions/question"
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

interface DeleteQuestionButtonProps {
  questionId: string
  testId: string
  questionText: string
}

export function DeleteQuestionButton({ questionId, testId, questionText }: DeleteQuestionButtonProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteQuestion(questionId, testId)
      toast.success("Вопрос удален")
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
        variant="ghost" 
        size="icon" 
        className="text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl">Удалить вопрос?</AlertDialogTitle>
              </div>
            </div>
            <div className="space-y-3">
              <AlertDialogDescription className="text-base leading-relaxed">
                Вы действительно хотите удалить этот вопрос?
              </AlertDialogDescription>
              <div className="p-3 bg-muted/50 border rounded-md">
                <div className="text-sm text-foreground/80 italic">
                  "{questionText.slice(0, 150)}{questionText.length > 150 ? '...' : ''}"
                </div>
              </div>
              <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ Это действие нельзя отменить
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
                  Удалить
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

