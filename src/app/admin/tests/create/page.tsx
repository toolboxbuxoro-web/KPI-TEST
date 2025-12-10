'use client'

import { createTest } from "@/app/actions/test"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { testSchema } from "@/lib/schemas"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Loader2 } from "lucide-react"

type TestFormValues = z.infer<typeof testSchema>

export default function CreateTestPage() {
  const router = useRouter()
  
  const form = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      title: "",
      description: "",
      timeLimit: undefined,
    },
  })

  async function onSubmit(data: TestFormValues) {
    try {
      await createTest(data)
      toast.success("Тест создан")
    } catch (error) {
      toast.error("Ошибка при создании теста")
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Создание нового теста</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название теста</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: Тест по продажам" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Краткое описание теста" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ограничение времени (минуты)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        placeholder="0 или пусто для безлимитного" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Оставьте пустым или 0, если ограничение не требуется
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                  Отмена
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {form.formState.isSubmitting ? "Создание..." : "Создать тест"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
