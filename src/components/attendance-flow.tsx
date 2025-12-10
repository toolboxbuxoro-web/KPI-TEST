'use client'

import { useState, useEffect } from 'react'
import { StoreQRScanner } from '@/components/store-qr-scanner'
import { AttendanceScanner } from '@/components/admin/attendance-scanner'
import { Button } from "@/components/ui/button"
import { Scan, ShieldCheck } from "lucide-react"
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
    // Force reload to ensure clean state and no lingering variables
    window.location.reload()
  }

  if (storeId) {
    return (
      <div className="w-full h-full">
         <AttendanceScanner preselectedStoreId={storeId} onResetStore={handleReset} />
      </div>
    )
  }

  if (isScanning) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 animate-in fade-in slide-in-from-bottom-5">
        <StoreQRScanner onScanSuccess={handleScanSuccess} />
        <Button variant="outline" onClick={() => setIsScanning(false)}>
          Назад
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
       <div className="text-center space-y-4 max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Toolbox <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-500">Control</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            {session ? `Добро пожаловать, ${session.user?.name || 'Админ'}` : 'Система контроля посещаемости'}
          </p>
       </div>

       <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
         <Button 
            size="lg" 
            className="h-14 text-lg gap-2 neo-gradient text-white rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform flex-1"
            onClick={() => setIsScanning(true)}
         >
           <Scan className="w-5 h-5" />
           Сканировать QR Магазина
         </Button>

         {!session && (
           <Link href="/login" className="flex-1">
             <Button variant="outline" size="lg" className="w-full h-14 text-lg gap-2 rounded-full border-2 hover:bg-muted/50 transition-colors">
               <ShieldCheck className="w-5 h-5" />
               Войти в Панель
             </Button>
           </Link>
         )}

         {session && (
           <Link href="/admin" className="flex-1">
             <Button variant="outline" size="lg" className="w-full h-14 text-lg gap-2 rounded-full border-2 hover:bg-muted/50 transition-colors">
               <ShieldCheck className="w-5 h-5" />
               Панель
             </Button>
           </Link>
         )}
       </div>
    </div>
  )
}
