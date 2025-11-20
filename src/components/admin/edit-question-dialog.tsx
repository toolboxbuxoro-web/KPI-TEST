'use client'

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { questionSchema } from "@/lib/schemas"
import { z } from "zod"
import { updateQuestion } from "@/app/actions/update-question"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Pencil, Trash2, Plus } from "lucide-react"
import { UploadButton } from "@/lib/uploadthing"

type QuestionFormValues = z.infer<typeof questionSchema>

interface EditQuestionDialogProps {
  testId: string
  question: {
    id: string
    text: string
    imageUrl?: string | null
    questionType: "single" | "multi" | string
    options: { id: string; text: string; isCorrect: boolean }[]
  }
  trigger?: React.ReactNode
}

export function EditQuestionDialog({ testId, question, trigger }: EditQuestionDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      testId: testId,
      text: question.text,
      imageUrl: question.imageUrl || undefined,
      questionType: question.questionType as "single" | "multi",
      options: question.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })),
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  })

  async function onSubmit(data: QuestionFormValues) {
    try {
      await updateQuestion(question.id, testId, data)
      toast.success("Вопрос обновлен")
      setOpen(false)
    } catch (error) {
      toast.error("Ошибка обновления")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать вопрос</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Текст вопроса</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Введите вопрос..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Изображение (опционально)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {field.value && (
                        <div className="relative w-full h-40 bg-gray-100 rounded-md overflow-hidden">
                          <img src={field.value} alt="Preview" className="w-full h-full object-contain" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => field.onChange(undefined)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <UploadButton
                        endpoint="imageUploader"
                        onClientUploadComplete={(res) => {
                          if (res?.[0]) {
                            field.onChange(res[0].url)
                            toast.success("Изображение загружено")
                          }
                        }}
                        onUploadError={(error: Error) => {
                          toast.error(`Ошибка: ${error.message}`)
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="questionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип вопроса</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="single">Одиночный выбор</SelectItem>
                      <SelectItem value="multi">Множественный выбор</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Варианты ответов</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ text: "", isCorrect: false })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </div>
              
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-4">
                  <FormField
                    control={form.control}
                    name={`options.${index}.isCorrect`}
                    render={({ field }) => (
                      <FormItem className="pt-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`options.${index}.text`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder={`Вариант ${index + 1}`} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 2}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <FormMessage>{form.formState.errors.options?.root?.message}</FormMessage>
            </div>

            <Button type="submit" className="w-full">Сохранить изменения</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
