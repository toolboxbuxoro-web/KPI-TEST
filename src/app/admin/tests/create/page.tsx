'use client'

import { createTest } from "@/app/actions/test"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export default function CreateTestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function onSubmit(formData: FormData) {
    setLoading(true)
    try {
      await createTest(formData)
      toast.success("Тест создан")
    } catch (error) {
      toast.error("Ошибка при создании теста")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Создание нового теста</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название теста</Label>
              <Input id="title" name="title" required placeholder="Например: Тест по продажам" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea id="description" name="description" placeholder="Краткое описание теста" />
            </div>
            <div className="flex justify-end gap-4">
              <Button variant="outline" type="button" onClick={() => router.back()}>
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Создание..." : "Создать тест"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
