'use client'

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { questionSchema } from "@/lib/schemas"
import { addQuestion } from "@/app/actions/question"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { UploadButton } from "@/lib/uploadthing"
import { toast } from "sonner"
import { Plus, Trash2, X } from "lucide-react"
import { z } from "zod"

type QuestionFormValues = z.infer<typeof questionSchema>

export default function AddQuestionForm({ testId }: { testId: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      testId,
      text: "",
      questionType: "single",
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false }
      ]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options"
  })

  async function onSubmit(data: QuestionFormValues) {
    setLoading(true)
    try {
      const payload = { ...data, imageUrl: imageUrl || undefined }
      const result = await addQuestion(payload)
      if (result?.error) {
        toast.error("Ошибка валидации")
        console.error(result.error)
      } else {
        toast.success("Вопрос добавлен")
        form.reset({
          testId,
          text: "",
          questionType: "single",
          options: [
            { text: "", isCorrect: false },
            { text: "", isCorrect: false }
          ]
        })
        setImageUrl(null)
      }
    } catch (error) {
      toast.error("Ошибка при сохранении")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Добавить вопрос</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Текст вопроса</Label>
            <Textarea {...form.register("text")} placeholder="Введите вопрос..." />
            {form.formState.errors.text && (
              <p className="text-sm text-destructive">{form.formState.errors.text.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Изображение (опционально)</Label>
            {imageUrl ? (
              <div className="relative w-full h-40 bg-gray-100 rounded-md overflow-hidden">
                <img src={imageUrl} alt="Uploaded" className="w-full h-full object-contain" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => setImageUrl(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <UploadButton
                endpoint="imageUploader"
                onClientUploadComplete={(res) => {
                  setImageUrl(res[0].url)
                  toast.success("Изображение загружено")
                }}
                onUploadError={(error: Error) => {
                  toast.error(`Ошибка загрузки: ${error.message}`)
                }}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Тип вопроса</Label>
            <Select 
              onValueChange={(val) => form.setValue("questionType", val as "single" | "multi")} 
              defaultValue={form.getValues("questionType")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Одиночный выбор</SelectItem>
                <SelectItem value="multi">Множественный выбор</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Варианты ответа</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => append({ text: "", isCorrect: false })}
              >
                <Plus className="h-3 w-3 mr-1" /> Вариант
              </Button>
            </div>
            
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input {...form.register(`options.${index}.text`)} placeholder={`Вариант ${index + 1}`} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={form.watch(`options.${index}.isCorrect`)}
                    onCheckedChange={(checked) => form.setValue(`options.${index}.isCorrect`, checked)}
                  />
                  {fields.length > 2 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {form.formState.errors.options && (
              <p className="text-sm text-destructive">{form.formState.errors.options.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Сохранение..." : "Добавить вопрос"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
