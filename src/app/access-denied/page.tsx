import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert, Home, LogIn } from "lucide-react"

export default function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center neo-pattern bg-background p-4">
      <Card className="w-full max-w-md neo-card neo-float shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center shadow-lg shadow-destructive/25">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">Доступ запрещен</CardTitle>
            <CardDescription className="text-base mt-2">
              У вас нет прав для просмотра этой страницы
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Эта страница доступна только пользователям с определенными правами. 
            Обратитесь к администратору, если считаете, что это ошибка.
          </p>
          
          <div className="flex flex-col gap-2 pt-4">
            <Button asChild className="w-full neo-gradient">
              <Link href="/admin">
                <Home className="mr-2 h-4 w-4" />
                На главную
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full neo-card">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Войти другим пользователем
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
