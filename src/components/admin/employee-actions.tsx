'use client'

import { useState } from "react"
import { deleteEmployee } from "@/app/actions/employee"
import { Button } from "@/components/ui/button"
import { EmployeeDialog } from "./employee-dialog"
import { Trash2, Pencil, MoreHorizontal, Copy } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface EmployeeActionsProps {
  employee: {
    id: string
    firstName: string
    lastName: string
    position: string
    imageUrl?: string | null
    documents?: {
      id: string
      name: string
      url: string
      type: string
      size: number
    }[]
  }
}

export function EmployeeActions({ employee }: EmployeeActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    try {
      const result = await deleteEmployee(employee.id)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Сотрудник удален")
        setDeleteDialogOpen(false)
        router.refresh()
      }
    } catch (error) {
      toast.error("Ошибка удаления сотрудника")
      console.error("Delete employee error:", error instanceof Error ? error.message : String(error))
    }
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/employee/${employee.id}`
    navigator.clipboard.writeText(link)
    toast.success("Ссылка скопирована в буфер обмена")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Открыть меню</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Действия</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleCopyLink}>
            <Copy className="mr-2 h-4 w-4" />
            Копировать ссылку для входа
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <EmployeeDialog 
            employee={employee}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="mr-2 h-4 w-4" />
                Редактировать
              </DropdownMenuItem>
            }
          />
          <DropdownMenuItem 
            onClick={() => setDeleteDialogOpen(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Сотрудник, его фотография профиля, все документы и результаты тестов будут удалены безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
