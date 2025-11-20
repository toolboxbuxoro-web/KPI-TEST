'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { employeeSchema } from "@/lib/schemas"
import { z } from "zod"
import { createEmployee, updateEmployee } from "@/app/actions/employee"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Plus, Pencil } from "lucide-react"

type EmployeeFormValues = z.infer<typeof employeeSchema>

interface EmployeeDialogProps {
  employee?: {
    id: string
    firstName: string
    lastName: string
    position: string
  }
  trigger?: React.ReactNode
}

export function EmployeeDialog({ employee, trigger }: EmployeeDialogProps) {
  const [open, setOpen] = useState(false)
  const isEditing = !!employee

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: employee?.firstName || "",
      lastName: employee?.lastName || "",
      position: employee?.position || "",
    },
  })

  async function onSubmit(data: EmployeeFormValues) {
    try {
      if (isEditing && employee) {
        await updateEmployee(employee.id, data)
        toast.success("Сотрудник обновлен")
      } else {
        await createEmployee(data)
        toast.success("Сотрудник создан")
      }
      setOpen(false)
      form.reset()
    } catch (error) {
      toast.error("Ошибка сохранения")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Добавить сотрудника
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Редактировать сотрудника" : "Новый сотрудник"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя</FormLabel>
                  <FormControl>
                    <Input placeholder="Иван" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Фамилия</FormLabel>
                  <FormControl>
                    <Input placeholder="Иванов" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Должность</FormLabel>
                  <FormControl>
                    <Input placeholder="Менеджер" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">Сохранить</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
