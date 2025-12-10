'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Store, Edit, Trash2, Clock, Users, MoreHorizontal, CheckCircle, AlertCircle } from 'lucide-react'

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
  
  const [formData, setFormData] = useState<StoreFormData>({
    name: '',
    address: '',
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
      workStartHour: 8,
      workEndHour: 18,
      isActive: true
    })
    setEditingStore(null)
  }

  const openEditDialog = (store: any) => {
    setEditingStore(store)
    setFormData({
      name: store.name,
      address: store.address || '',
      workStartHour: store.workStartHour,
      workEndHour: store.workEndHour,
      isActive: store.isActive
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Введите название магазина')
      return
    }

    try {
      if (editingStore) {
        await updateStore(editingStore.id, formData)
        toast.success('Магазин обновлен')
      } else {
        await createStore(formData)
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
            
            <div className="space-y-4 py-4">
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
            <Card key={store.id} className={`relative ${!store.isActive ? 'opacity-60' : ''}`}>
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
    </div>
  )
}
