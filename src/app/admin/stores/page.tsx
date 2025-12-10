'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { Plus, Store, Edit, Trash2, Clock, Users, MoreHorizontal, CheckCircle, AlertCircle, MapPin, Navigation, Loader2, QrCode as QrCodeIcon, Download } from 'lucide-react'
import QRCode from "react-qr-code"

// Dynamic import for Leaflet map (SSR incompatible)
const StoreLocationMap = dynamic(
  () => import('@/components/admin/StoreLocationMap').then(mod => mod.StoreLocationMap),
  { ssr: false, loading: () => <div className="w-full h-40 bg-muted/50 rounded-lg animate-pulse" /> }
)

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"

import { 
  getAllStoresIncludingInactive, 
  createStore, 
  updateStore, 
  deleteStore 
} from '@/app/actions/store'

interface StoreFormData {
  name: string
  address: string
  latitude: string
  longitude: string
  radiusMeters: number
  workStartHour: number
  workEndHour: number
  isActive: boolean
}

export default function StoresPage() {
  const [stores, setStores] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [storeToDelete, setStoreToDelete] = useState<any>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrStore, setQrStore] = useState<any>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<StoreFormData>({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radiusMeters: 100,
    workStartHour: 8,
    workEndHour: 18,
    isActive: true
  })

  const loadStores = async () => {
    setIsLoading(true)
    try {
      const data = await getAllStoresIncludingInactive()
      setStores(data)
    } catch (error) {
      console.error('Failed to load stores', error)
      toast.error('Ошибка загрузки магазинов')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStores()
  }, [])

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      radiusMeters: 100,
      workStartHour: 8,
      workEndHour: 18,
      isActive: true
    })
    setEditingStore(null)
    setGeoError(null)
  }

  const openEditDialog = (store: any) => {
    setEditingStore(store)
    setFormData({
      name: store.name,
      address: store.address || '',
      latitude: store.latitude ? String(store.latitude) : '',
      longitude: store.longitude ? String(store.longitude) : '',
      radiusMeters: store.radiusMeters ?? 100,
      workStartHour: store.workStartHour,
      workEndHour: store.workEndHour,
      isActive: store.isActive
    })
    setGeoError(null)
    setDialogOpen(true)
  }

  // Geolocation detection
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Геолокация не поддерживается браузером')
      return
    }

    setIsGettingLocation(true)
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: String(Math.round(position.coords.latitude * 1000000) / 1000000),
          longitude: String(Math.round(position.coords.longitude * 1000000) / 1000000)
        }))
        setIsGettingLocation(false)
        toast.success('Местоположение определено')
      },
      (error) => {
        setIsGettingLocation(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Доступ к геолокации запрещён')
            break
          case error.POSITION_UNAVAILABLE:
            setGeoError('Местоположение недоступно')
            break
          case error.TIMEOUT:
            setGeoError('Время ожидания истекло')
            break
          default:
            setGeoError('Ошибка определения местоположения')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  // Coordinate validation
  const getValidCoordinate = (val: string): number | null => {
      const num = parseFloat(val.replace(',', '.'))
      return !isNaN(num) ? num : null
  }

  const isValidLatitude = (latStr: string) => {
      if (!latStr) return true // empty is OK for UI unless required
      const val = getValidCoordinate(latStr)
      return val !== null && val >= -90 && val <= 90
  }
  
  const isValidLongitude = (lngStr: string) => {
      if (!lngStr) return true
      const val = getValidCoordinate(lngStr)
      return val !== null && val >= -180 && val <= 180
  }

  const latNum = getValidCoordinate(formData.latitude)
  const lngNum = getValidCoordinate(formData.longitude)
  
  const hasValidCoordinates = latNum !== null && lngNum !== null && 
    isValidLatitude(formData.latitude) && isValidLongitude(formData.longitude)

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Введите название магазина')
      return
    }

    try {
      const payload = {
        ...formData,
        latitude: getValidCoordinate(formData.latitude),
        longitude: getValidCoordinate(formData.longitude)
      }

      if (editingStore) {
        await updateStore(editingStore.id, payload)
        toast.success('Магазин обновлен')
      } else {
        await createStore(payload)
        toast.success('Магазин создан')
      }
      setDialogOpen(false)
      resetForm()
      loadStores()
    } catch (error) {
      toast.error('Ошибка сохранения')
    }
  }

  const handleDelete = async () => {
    if (!storeToDelete) return
    
    try {
      const result = await deleteStore(storeToDelete.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Магазин удален')
        loadStores()
      }
    } catch (error) {
      toast.error('Ошибка удаления')
    } finally {
      setDeleteDialogOpen(false)
      setStoreToDelete(null)
    }
  }

  const handleDownloadQr = () => {
    const svg = document.getElementById("store-qr-code")
    if (!svg) {
        toast.error("QR код не найден")
        return
    }

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()
    
    img.onload = () => {
      canvas.width = img.width + 40
      canvas.height = img.height + 60 // More space for text
      if (ctx) {
         ctx.fillStyle = "white"
         ctx.fillRect(0, 0, canvas.width, canvas.height)
         ctx.drawImage(img, 20, 20)
         
         // Add Store Name
         if (qrStore) {
             ctx.font = "bold 20px Arial"
             ctx.fillStyle = "black"
             ctx.textAlign = "center"
             ctx.fillText(qrStore.name, canvas.width / 2, canvas.height - 15)
         }
         
         const pngFile = canvas.toDataURL("image/png")
         const downloadLink = document.createElement("a")
         downloadLink.download = `QR-${qrStore?.name || 'Store'}.png`
         downloadLink.href = pngFile
         downloadLink.click()
         toast.success("QR код скачан")
      }
    }
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Магазины</h1>
          <p className="text-muted-foreground">Управление точками продаж</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Добавить магазин
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStore ? 'Редактировать магазин' : 'Новый магазин'}</DialogTitle>
              <DialogDescription>
                {editingStore ? 'Измените данные магазина' : 'Добавьте новую точку продаж'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4 flex-1 overflow-y-auto px-1">
              <div className="space-y-2">
                <Label htmlFor="name">Название *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Центральный магазин"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Адрес</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="ул. Примерная, 123"
                />
              </div>

              {/* Geolocation Section */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Геолокация</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={detectLocation}
                    disabled={isGettingLocation}
                    className="gap-2"
                  >
                    {isGettingLocation ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Navigation className="h-3.5 w-3.5" />
                    )}
                    Определить
                  </Button>
                </div>

                {geoError && (
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    {geoError}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="latitude" className="text-xs">Широта</Label>
                    <Input
                      id="latitude"
                      type="text"
                      inputMode="decimal"
                      value={formData.latitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                      placeholder="39.7749"
                      className={!isValidLatitude(formData.latitude) ? 'border-destructive' : ''}
                    />
                    {formData.latitude !== null && !isValidLatitude(formData.latitude) && (
                      <p className="text-xs text-destructive">-90 до 90</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="longitude" className="text-xs">Долгота</Label>
                    <Input
                      id="longitude"
                      type="text"
                      inputMode="decimal"
                      value={formData.longitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                      placeholder="64.4194"
                      className={!isValidLongitude(formData.longitude) ? 'border-destructive' : ''}
                    />
                    {formData.longitude !== null && !isValidLongitude(formData.longitude) && (
                      <p className="text-xs text-destructive">-180 до 180</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="radius" className="text-xs">Радиус (м)</Label>
                    <Input
                      id="radius"
                      type="number"
                      min={10}
                      max={10000}
                      value={formData.radiusMeters}
                      onChange={(e) => setFormData(prev => ({ ...prev, radiusMeters: parseInt(e.target.value) || 100 }))}
                      placeholder="100"
                    />
                  </div>
                </div>

                {/* Mini-map preview */}
                {hasValidCoordinates && (
                  <div className="mt-3">
                    <StoreLocationMap
                      latitude={latNum!}
                      longitude={lngNum!}
                      radiusMeters={formData.radiusMeters}
                    />
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Радиус покрытия: {formData.radiusMeters}м
                    </p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workStart">Начало работы</Label>
                  <Input
                    id="workStart"
                    type="number"
                    min={0}
                    max={23}
                    value={formData.workStartHour}
                    onChange={(e) => setFormData(prev => ({ ...prev, workStartHour: parseInt(e.target.value) || 8 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workEnd">Конец работы</Label>
                  <Input
                    id="workEnd"
                    type="number"
                    min={0}
                    max={23}
                    value={formData.workEndHour}
                    onChange={(e) => setFormData(prev => ({ ...prev, workEndHour: parseInt(e.target.value) || 18 }))}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Активен</Label>
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSubmit}>
                {editingStore ? 'Сохранить' : 'Создать'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : stores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Нет магазинов</p>
            <p className="text-sm text-muted-foreground">Добавьте первый магазин для начала работы</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Card key={store.id} className={`relative neo-card neo-float ${!store.isActive ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${store.isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Store className={`h-5 w-5 ${store.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{store.name}</CardTitle>
                      {store.address && (
                        <CardDescription className="text-xs mt-0.5">{store.address}</CardDescription>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(store)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setQrStore(store)
                        setQrDialogOpen(true)
                      }}>
                        <QrCodeIcon className="h-4 w-4 mr-2" />
                        QR Код
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          setStoreToDelete(store)
                          setDeleteDialogOpen(true)
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{String(store.workStartHour).padStart(2, '0')}:00 - {String(store.workEndHour).padStart(2, '0')}:00</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{store._count?.attendance || 0} записей</span>
                  </div>
                </div>
                
                <div className="mt-3">
                  {store.isActive ? (
                    <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Активен
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted border-muted-foreground/30 text-muted-foreground">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Неактивен
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить магазин?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить магазин "{storeToDelete?.name}"? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Код Магазина</DialogTitle>
            <DialogDescription>
              Отсканируйте этот код для настройки терминала в магазине "{qrStore?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg">
             {qrStore && (
                <div className="p-4 bg-white">
                  <QRCode
                    id="store-qr-code"
                    value={qrStore.id}
                    size={200}
                    level="H"
                  />
                </div>
             )}
             <p className="text-xs text-gray-500 mt-2 font-mono">{qrStore?.id}</p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleDownloadQr} className="w-full sm:w-auto gap-2">
              <Download className="h-4 w-4" />
              Скачать QR-код
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
