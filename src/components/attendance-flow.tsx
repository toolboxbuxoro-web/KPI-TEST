'use client'

import { useState, useEffect } from 'react'
import { StoreQRScanner } from '@/components/store-qr-scanner'
import { AttendanceScanner } from '@/components/admin/attendance-scanner'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Clock, 
  ShieldCheck, 
  ScanLine, 
  UserCheck, 
  Building2,
  ArrowRight,
  Fingerprint,
  KeyRound
} from "lucide-react"
import Link from 'next/link'
import { useSession } from "next-auth/react"

export function AttendanceFlow() {
  const { data: session } = useSession()
  const [storeId, setStoreId] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  // Persist storeId in localStorage to survive refreshes in Kiosk mode
  useEffect(() => {
    const savedStoreId = localStorage.getItem('toolbox_kiosk_store_id')
    if (savedStoreId) {
      setStoreId(savedStoreId)
    }
  }, [])

  const handleScanSuccess = (id: string) => {
    setStoreId(id)
    localStorage.setItem('toolbox_kiosk_store_id', id)
    setIsScanning(false)
  }

  const handleReset = () => {
    localStorage.removeItem('toolbox_kiosk_store_id')
    setStoreId(null)
    setIsScanning(false)
    window.location.reload()
  }

  // Kiosk mode - show scanner directly
  if (storeId) {
    return (
      <div className="w-full h-full">
         <AttendanceScanner preselectedStoreId={storeId} onResetStore={handleReset} />
      </div>
    )
  }

  // QR Scanner mode
  if (isScanning) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 animate-in fade-in slide-in-from-bottom-5">
        <StoreQRScanner onScanSuccess={handleScanSuccess} />
        <Button variant="outline" onClick={() => setIsScanning(false)} className="rounded-full">
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
         
         {/* Attendance Card - Primary Action */}
         <Card className="group relative overflow-hidden neo-card hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-primary/30"
               onClick={() => window.location.href = '/check'}>
           <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           <CardHeader className="pb-2">
             <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
               <Clock className="h-6 w-6 text-primary" />
             </div>
             <CardTitle className="text-xl flex items-center gap-2">
               Посещаемость
               <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
             </CardTitle>
             <CardDescription>
               Отметить вход или выход
             </CardDescription>
           </CardHeader>
           <CardContent className="pt-0">
             <div className="flex flex-wrap gap-2">
               <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                 <KeyRound className="h-3 w-3" />
                 <span>По логину</span>
               </div>
               <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                 <ScanLine className="h-3 w-3" />
                 <span>По QR-коду</span>
               </div>
             </div>
           </CardContent>
         </Card>

         {/* Terminal/Kiosk Card */}
         <Card className="group relative overflow-hidden neo-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-orange-500/30"
               onClick={() => setIsScanning(true)}>
           <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           <CardHeader className="pb-2">
             <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
               <Building2 className="h-6 w-6 text-orange-500" />
             </div>
             <CardTitle className="text-xl flex items-center gap-2">
               Режим терминала
               <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-orange-500" />
             </CardTitle>
             <CardDescription>
               Сканирование лиц для магазина
             </CardDescription>
           </CardHeader>
           <CardContent className="pt-0">
             <div className="flex flex-wrap gap-2">
               <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                 <Fingerprint className="h-3 w-3" />
                 <span>Face ID</span>
               </div>
               <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                 <ScanLine className="h-3 w-3" />
                 <span>QR магазина</span>
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

