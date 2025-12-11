'use client'

import { useState, useEffect } from 'react'
import { authenticateStore } from '@/app/actions/store-auth'
import { AttendanceScanner } from '@/components/admin/attendance-scanner'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Clock, 
  ShieldCheck, 
  ScanLine, 
  UserCheck, 
  Building2,
  ArrowRight,
  Fingerprint,
  KeyRound,
  Loader2,
  ArrowLeft
} from "lucide-react"
import Link from 'next/link'
import { useSession } from "next-auth/react"
import { toast } from 'sonner'

export function AttendanceFlow() {
  const { data: session } = useSession()
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeName, setStoreName] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Persist storeId in localStorage to survive refreshes in Kiosk mode
  useEffect(() => {
    const savedStoreId = localStorage.getItem('toolbox_kiosk_store_id')
    const savedStoreName = localStorage.getItem('toolbox_kiosk_store_name')
    if (savedStoreId) {
      setStoreId(savedStoreId)
      setStoreName(savedStoreName)
    }
  }, [])

  const handleLogin = async () => {
    if (!login.trim() || !password.trim()) {
      toast.error('Введите логин и пароль')
      return
    }

    setIsLoading(true)
    try {
      const result = await authenticateStore(login, password)
      if (result.success && result.storeId) {
        setStoreId(result.storeId)
        setStoreName(result.storeName || null)
        localStorage.setItem('toolbox_kiosk_store_id', result.storeId)
        if (result.storeName) {
          localStorage.setItem('toolbox_kiosk_store_name', result.storeName)
        }
        setIsLoggingIn(false)
        toast.success(`Терминал: ${result.storeName}`)
      } else {
        toast.error(result.error || 'Ошибка входа')
      }
    } catch (error) {
      toast.error('Ошибка сети')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    localStorage.removeItem('toolbox_kiosk_store_id')
    localStorage.removeItem('toolbox_kiosk_store_name')
    setStoreId(null)
    setStoreName(null)
    setLogin('')
    setPassword('')
    setIsLoggingIn(false)
    window.location.reload()
  }

  // Kiosk mode - show scanner directly (full screen)
  if (storeId) {
    return (
      <div className="w-full flex-1">
         <AttendanceScanner preselectedStoreId={storeId} onResetStore={handleReset} />
      </div>
    )
  }

  // Store Login Form
  if (isLoggingIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-in fade-in slide-in-from-bottom-5 px-4 py-8">
        <Card className="w-full max-w-md neo-card neo-float p-2">
          <CardHeader className="text-center pb-6">
            <div className="h-20 w-20 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-6">
              <Building2 className="h-10 w-10 text-orange-500" />
            </div>
            <CardTitle className="text-2xl md:text-3xl">Вход в терминал</CardTitle>
            <CardDescription className="text-base mt-2">Введите логин и пароль магазина</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="store-login">Логин магазина</Label>
                <Input
                  id="store-login"
                  placeholder="Введите логин..."
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="neo-input h-12"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-password">Пароль</Label>
                <Input
                  id="store-password"
                  type="password"
                  placeholder="Введите пароль..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="neo-input h-12"
                  autoComplete="current-password"
                />
              </div>
              <Button 
                type="submit"
                className="w-full neo-gradient h-12 text-base mt-4" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <KeyRound className="mr-2 h-5 w-5" />
                )}
                Войти в терминал
              </Button>
            </form>
          </CardContent>
        </Card>
        <Button variant="outline" onClick={() => setIsLoggingIn(false)} className="rounded-full gap-2">
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Button>
      </div>
    )
  }

  // Main landing
  return (
    <div className="flex flex-col items-center justify-center gap-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
       {/* Hero Section */}
       <div className="text-center space-y-4 max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Toolbox <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-500">Control</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            {session ? `Добро пожаловать, ${session.user?.name || 'Администратор'}!` : 'Система контроля и учёта рабочего времени'}
          </p>
       </div>

       {/* Action Cards Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full max-w-2xl">

         {/* Terminal/Kiosk Card */}
         <Card className="md:col-span-2 group relative overflow-hidden neo-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-orange-500/30"
               onClick={() => setIsLoggingIn(true)}>
           <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           <CardHeader className="pb-2">
             <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
               <Building2 className="h-6 w-6 text-orange-500" />
             </div>
             <CardTitle className="text-xl flex items-center gap-2">
               Вход в терминал
               <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-orange-500" />
             </CardTitle>
             <CardDescription>
               Вход по QR-коду или логину магазина
             </CardDescription>
           </CardHeader>
           <CardContent className="pt-0">
             <div className="flex flex-wrap gap-2">
               <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                 <ScanLine className="h-3 w-3" />
                 <span>По QR-коду</span>
               </div>
               <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                 <KeyRound className="h-3 w-3" />
                 <span>Логин магазина</span>
               </div>
               <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                 <Fingerprint className="h-3 w-3" />
                 <span>Face ID</span>
               </div>
             </div>
           </CardContent>
         </Card>

         {/* Admin Panel Card - Full width on bottom */}
         {session ? (
           <Link href="/admin" className="md:col-span-2">
             <Card className="group relative overflow-hidden neo-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-green-500/30">
               <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <CardHeader className="pb-3">
                 <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                     <ShieldCheck className="h-6 w-6 text-green-500" />
                   </div>
                   <div className="flex-1">
                     <CardTitle className="text-xl flex items-center gap-2">
                       Панель администратора
                       <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-green-500" />
                     </CardTitle>
                     <CardDescription>
                       Управление сотрудниками, магазинами и отчётами
                     </CardDescription>
                   </div>
                 </div>
               </CardHeader>
             </Card>
           </Link>
         ) : (
           <Link href="/login" className="md:col-span-2">
             <Card className="group relative overflow-hidden neo-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-blue-500/30">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <CardHeader className="pb-3">
                 <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                     <ShieldCheck className="h-6 w-6 text-blue-500" />
                   </div>
                   <div className="flex-1">
                     <CardTitle className="text-xl flex items-center gap-2">
                       Войти в систему
                       <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                     </CardTitle>
                     <CardDescription>
                       Доступ к панели управления для администраторов
                     </CardDescription>
                   </div>
                 </div>
               </CardHeader>
             </Card>
           </Link>
         )}
       </div>

       {/* Quick Stats or Info */}
       <div className="flex items-center gap-6 text-sm text-muted-foreground">
         <div className="flex items-center gap-2">
           <UserCheck className="h-4 w-4" />
           <span>Учёт времени</span>
         </div>
         <div className="h-4 w-px bg-border" />
         <div className="flex items-center gap-2">
           <Fingerprint className="h-4 w-4" />
           <span>Биометрия</span>
         </div>
         <div className="h-4 w-px bg-border" />
         <div className="flex items-center gap-2">
           <Building2 className="h-4 w-4" />
           <span>Мультимагазин</span>
         </div>
       </div>
    </div>
  )
}

