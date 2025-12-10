import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Users } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-3xl space-y-8">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          Toolbox <span className="text-blue-600">Control</span>
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400">
          Система оценки эффективности сотрудников. Создавайте тесты, отслеживайте результаты и повышайте квалификацию команды.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link href="/admin">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-lg gap-2">
              <Shield className="w-5 h-5" />
              Вход для Администратора
            </Button>
          </Link>
          {/* In a real app, employees might have a separate login or use a magic link. 
              For this demo, we'll link to a demo employee if they exist, or just show a placeholder. 
          */}
          <Link href="/admin/employees">
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-lg gap-2">
              <Users className="w-5 h-5" />
              Список сотрудников (Demo)
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
