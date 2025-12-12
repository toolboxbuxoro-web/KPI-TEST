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
      // Get client IP for IP restriction check
      let clientIP: string | null = null
      try {
        const ipResponse = await fetch('/api/client-ip')
        const ipData = await ipResponse.json()
        clientIP = ipData.ip
      } catch {
        // Continue without IP - server will reject if store has IP restrictions
        console.warn('Failed to get client IP')
      }

      const result = await authenticateStore(login, password, clientIP)
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
      <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4 py-8 animate-in fade-in zoom-in-95 duration-500">
        <Card className="w-full max-w-lg border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-transparent to-transparent pointer-events-none" />
          
          <CardHeader className="text-center pb-2 pt-8 relative z-10">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-[1px] mx-auto mb-6 shadow-lg shadow-orange-500/20">
              <div className="h-full w-full rounded-[23px] bg-background/80 flex items-center justify-center backdrop-blur-sm">
                <Building2 className="h-10 w-10 text-orange-500" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">Вход в терминал</CardTitle>
            <CardDescription className="text-lg mt-2 text-muted-foreground">
              Введите данные для активации точки
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8 p-8 relative z-10">
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="store-login" className="text-sm font-medium ml-1">Логин магазина</Label>
                <div className="relative group">
                  <div className="absolute left-3 top-3.5 text-muted-foreground group-focus-within:text-orange-500 transition-colors">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <Input
                    id="store-login"
                    placeholder="store_01"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="pl-10 h-12 bg-white/10 border-white/20 focus:border-orange-500/50 focus:ring-orange-500/20 transition-all text-base placeholder:text-muted-foreground/50"
                    autoComplete="username"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="store-password">Пароль</Label>
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-3.5 text-muted-foreground group-focus-within:text-orange-500 transition-colors">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <Input
                    id="store-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-white/10 border-white/20 focus:border-orange-500/50 focus:ring-orange-500/20 transition-all text-base placeholder:text-muted-foreground/50 font-mono tracking-widest"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit"
                  className="w-full h-12 text-base font-medium shadow-lg shadow-orange-500/20 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <div className="flex items-center">
                      <span>Войти в систему</span>
                      <ArrowRight className="ml-2 h-5 w-5 opacity-80" />
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <Button 
          variant="ghost" 
          onClick={() => setIsLoggingIn(false)} 
          className="rounded-full gap-2 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться назад
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
         ) : null}
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

