'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  MapPin, 
  LogIn, 
  LogOut, 
  Loader2, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  RefreshCw,
  QrCode,
  Key
} from 'lucide-react'
import { toast } from 'sonner'

interface GeoPosition {
  lat: number
  lng: number
  accuracy: number
}

interface EmployeeStatus {
  employee: {
    id: string
    firstName: string
    lastName: string
  }
  today: {
    checked_in: boolean
    checked_out: boolean
    check_in_time?: string
    check_out_time?: string
    store?: string
    in_zone?: boolean
  }
}

type AuthMode = 'code' | 'login'

export default function CheckPage() {
  const [authMode, setAuthMode] = useState<AuthMode>('code')
  const [employeeCode, setEmployeeCode] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<EmployeeStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [geoPosition, setGeoPosition] = useState<GeoPosition | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  // Request geolocation
  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Геолокация не поддерживается')
      return
    }

    setGeoLoading(true)
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
        setGeoLoading(false)
      },
      (error) => {
        setGeoError(
          error.code === 1 ? 'Доступ к геолокации запрещён' :
          error.code === 2 ? 'Геолокация недоступна' :
          'Превышено время ожидания'
        )
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  // Auto-request geolocation on mount
  useEffect(() => {
    requestGeolocation()
  }, [requestGeolocation])

  // Check employee status
  const checkStatus = async () => {
    if (authMode === 'code' && !employeeCode.trim()) {
      toast.error('Введите код сотрудника')
      return
    }
    if (authMode === 'login' && (!login.trim() || !password.trim())) {
      toast.error('Введите логин и пароль')
      return
    }

    setLoading(true)
    try {
      const params = authMode === 'code' 
        ? `employee_code=${encodeURIComponent(employeeCode)}`
        : `login=${encodeURIComponent(login)}&password=${encodeURIComponent(password)}`
      
      const res = await fetch(`/api/attendance/check?${params}`)
      const data = await res.json()
      
      if (!res.ok) {
        toast.error(data.error || 'Ошибка проверки')
        setStatus(null)
        return
      }

      setStatus(data)
    } catch (error) {
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  // Perform check-in or check-out
  const performCheck = async (type: 'in' | 'out') => {
    if (!status) return

    setChecking(true)
    try {
      const body = authMode === 'code' 
        ? {
            employee_code: employeeCode,
            type,
            geo: geoPosition ? { lat: geoPosition.lat, lng: geoPosition.lng } : undefined,
            device: 'mobile'
          }
        : {
            login,
            password,
            type,
            geo: geoPosition ? { lat: geoPosition.lat, lng: geoPosition.lng } : undefined,
            device: 'mobile'
          }

      const res = await fetch('/api/attendance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Ошибка отметки')
        return
      }

      toast.success(type === 'in' ? 'Вход отмечен!' : 'Выход отмечен!')
      
      // Refresh status
      await checkStatus()
    } catch (error) {
      toast.error('Ошибка сети')
    } finally {
      setChecking(false)
    }
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const resetForm = () => {
    setStatus(null)
    setEmployeeCode('')
    setLogin('')
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-background neo-pattern p-4 flex flex-col items-center justify-center">
      <Card className="w-full max-w-md neo-card neo-float">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Отметка посещаемости</CardTitle>
          <p className="text-muted-foreground text-sm">Toolbox Control</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Geolocation Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-white/5">
            <div className="flex items-center gap-2">
              <MapPin className={`h-5 w-5 ${geoPosition ? 'text-green-500' : geoError ? 'text-red-500' : 'text-muted-foreground'}`} />
              <span className="text-sm">
                {geoLoading ? 'Определение...' : 
                 geoPosition ? `${geoPosition.lat.toFixed(4)}, ${geoPosition.lng.toFixed(4)}` :
                 geoError || 'Нет данных'}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={requestGeolocation}
              disabled={geoLoading}
            >
              <RefreshCw className={`h-4 w-4 ${geoLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Auth Mode Toggle */}
          {!status && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={authMode === 'code' ? 'default' : 'outline'}
                className={authMode === 'code' ? 'neo-gradient' : ''}
                onClick={() => setAuthMode('code')}
              >
                <QrCode className="mr-2 h-4 w-4" />
                По коду
              </Button>
              <Button
                variant={authMode === 'login' ? 'default' : 'outline'}
                className={authMode === 'login' ? 'neo-gradient' : ''}
                onClick={() => setAuthMode('login')}
              >
                <Key className="mr-2 h-4 w-4" />
                По логину
              </Button>
            </div>
          )}

          {/* Employee Code Input */}
          {!status && authMode === 'code' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Код сотрудника</Label>
                <Input
                  id="code"
                  placeholder="Введите код..."
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && checkStatus()}
                  className="neo-input"
                />
              </div>
              <Button 
                className="w-full neo-gradient" 
                onClick={checkStatus}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Проверить
              </Button>
            </div>
          )}

          {/* Login/Password Input */}
          {!status && authMode === 'login' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">Логин</Label>
                <Input
                  id="login"
                  placeholder="Введите логин..."
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="neo-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Введите пароль..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && checkStatus()}
                  className="neo-input"
                />
              </div>
              <Button 
                className="w-full neo-gradient" 
                onClick={checkStatus}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Войти
              </Button>
            </div>
          )}

          {/* Employee Status */}
          {status && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-2xl font-bold text-primary">
                  {status.employee.firstName} {status.employee.lastName}
                </div>
                {status.today.store && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {status.today.store}
                  </div>
                )}
              </div>

              {/* Today's Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-white/5">
                  <span>Вход</span>
                  <div className="flex items-center gap-2">
                    {status.today.checked_in ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-mono">
                          {status.today.check_in_time && formatTime(status.today.check_in_time)}
                        </span>
                      </>
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-white/5">
                  <span>Выход</span>
                  <div className="flex items-center gap-2">
                    {status.today.checked_out ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-mono">
                          {status.today.check_out_time && formatTime(status.today.check_out_time)}
                        </span>
                      </>
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {status.today.in_zone === false && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-sm">Вне зоны магазина</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  onClick={() => performCheck('in')}
                  disabled={checking || status.today.checked_in}
                  className={`h-20 flex-col gap-2 ${!status.today.checked_in ? 'neo-gradient' : ''}`}
                >
                  {checking ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <LogIn className="h-6 w-6" />
                  )}
                  <span>Вход</span>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => performCheck('out')}
                  disabled={checking || !status.today.checked_in || status.today.checked_out}
                  className={`h-20 flex-col gap-2 ${status.today.checked_in && !status.today.checked_out ? 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50' : ''}`}
                >
                  {checking ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <LogOut className="h-6 w-6" />
                  )}
                  <span>Выход</span>
                </Button>
              </div>

              {/* Change Employee */}
              <Button
                variant="ghost"
                className="w-full"
                onClick={resetForm}
              >
                Другой сотрудник
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        © {new Date().getFullYear()} Toolbox Control
      </p>
    </div>
  )
}
