'use client'

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, Suspense } from "react"
import { toast } from "sonner"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, LogIn, ShieldCheck, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

function LoginContent() {
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl")
  const error = searchParams.get("error")

  // Helper function to check if input is email format
  const isEmail = (str: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
  }

  // Get redirect URL based on user role/type
  const getRedirectUrl = (role?: string, userId?: string) => {
    if (callbackUrl) return callbackUrl
    
    switch (role) {
      case 'SUPER_ADMIN':
        return '/admin'
      case 'STORE_MANAGER':
        return '/admin'
      case 'EMPLOYEE':
        return userId ? `/employee/${userId}` : '/check'
      default:
        return '/admin'
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!login || !password) {
      toast.error("Заполните все поля")
      return
    }
    
    setLoading(true)
    
    try {
      // Check if it's a Store login (not email format)
      if (!isEmail(login)) {
        // Try Store authentication
        const response = await fetch('/api/kiosk/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login, password })
        })

        const data = await response.json()

        if (!response.ok) {
          toast.error(data.error || "Неверный логин или пароль")
          setLoading(false)
          return
        }

        // Store login successful - redirect to kiosk terminal
        toast.success("Вход выполнен успешно")
        
        // Save store info to localStorage for kiosk mode
        if (data.storeId && data.accessToken) {
          localStorage.setItem('toolbox_kiosk_store_id', data.storeId)
          localStorage.setItem('toolbox_kiosk_store_name', data.storeName || '')
          localStorage.setItem('toolbox_kiosk_access_token', data.accessToken)
        }
        
        router.push('/check')
        router.refresh()
        return
      }

      // Employee login (email format) - use NextAuth
      const result = await signIn("credentials", {
        email: login,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("Неверный email или пароль")
      } else if (result?.ok) {
        toast.success("Вход выполнен успешно")
        
        // Get user session to determine redirect
        try {
          const sessionResponse = await fetch('/api/auth/session')
          const session = await sessionResponse.json()
          
          const redirectUrl = getRedirectUrl(session?.user?.role, session?.user?.id)
          router.push(redirectUrl)
          router.refresh()
        } catch (err) {
          // Fallback to default redirect
          router.push(callbackUrl || '/admin')
          router.refresh()
        }
      }
    } catch (error) {
      console.error("Login error:", error)
      toast.error("Произошла ошибка при входе")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center neo-pattern bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="neo-card neo-float shadow-2xl">
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="mx-auto w-16 h-16 rounded-2xl neo-gradient flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Вход в систему
            </CardTitle>
            <CardDescription className="text-base">
              Toolbox Control System
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 neo-card">
                <AlertDescription>
                  {error === "CredentialsSignin" 
                    ? "Неверный email или пароль" 
                    : "Произошла ошибка при входе"}
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login" className="text-sm font-medium">
                  Логин / Email
                </Label>
                <Input 
                  id="login" 
                  type="text" 
                  value={login} 
                  onChange={(e) => setLogin(e.target.value)} 
                  required 
                  autoFocus
                  disabled={loading}
                  placeholder="ivan@example.com или логин магазина"
                  className="h-11 text-base neo-input"
                />
                <p className="text-xs text-muted-foreground">
                  Для сотрудников: email. Для магазинов: логин магазина
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Пароль
                </Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  disabled={loading}
                  placeholder="••••••••"
                  className="h-11 text-base neo-input"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-semibold neo-gradient" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Вход...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    Войти
                  </>
                )}
              </Button>
            </form>

            <Button 
              variant="link" 
              className="w-full mt-4 text-muted-foreground hover:text-primary"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться на главную
            </Button>
            
            <div className="mt-6 pt-6 border-t border-border/50">
              <p className="text-xs text-center text-muted-foreground">
                Toolbox Control System © 2025
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center neo-pattern bg-background p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
