'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { employeeSchema } from "@/lib/schemas"
import { z } from "zod"
import { createEmployee, updateEmployee, addDocument, deleteDocument } from "@/app/actions/employee"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, FileText, Image as ImageIcon, Loader2, Camera, Building2, CalendarDays } from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import Webcam from "react-webcam"
import { useUploadThing } from "@/lib/uploadthing"
import { useRef } from "react"

type EmployeeFormValues = z.infer<typeof employeeSchema>

interface StoreOption {
  id: string
  name: string
}

interface EmployeeDialogProps {
  employee?: {
    id: string
    firstName: string
    lastName: string
    middleName?: string | null
    phone?: string | null
    email?: string | null
    birthDate?: Date | null
    position: string
    role?: string
    storeId?: string | null
    isActive?: boolean
    login?: string | null
    imageUrl?: string | null
    documents?: {
      id: string
      name: string
      url: string
      type: string
      size: number
    }[]
  }
  trigger?: React.ReactNode
  stores?: StoreOption[]
}

export function EmployeeDialog({ employee, trigger, stores: initialStores }: EmployeeDialogProps) {
  const [open, setOpen] = useState(false)
  const [docLoading, setDocLoading] = useState<string | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [stores, setStores] = useState<StoreOption[]>(initialStores || [])
  const webcamRef = useRef<Webcam>(null)
  const isEditing = !!employee

  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res) => {
      if (res && res[0]) {
        form.setValue("imageUrl", res[0].url)
        toast.success("Фото загружено")
        setIsCameraOpen(false)
      }
    },
    onUploadError: () => {
      toast.error("Ошибка загрузки фото")
    },
  })

  const capture = async () => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      try {
        // Convert base64 to blob
        const res = await fetch(imageSrc)
        const blob = await res.blob()
        const file = new File([blob], "webcam-photo.jpg", { type: "image/jpeg" })
        
        await startUpload([file])
      } catch (e) {
        toast.error("Ошибка обработки фото")
      }
    }
  }

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: employee?.firstName || "",
      lastName: employee?.lastName || "",
      middleName: employee?.middleName || "",
      phone: employee?.phone || "",
      email: employee?.email || "",
      login: employee?.login || "",
      password: "",
      birthDate: employee?.birthDate ? new Date(employee.birthDate).toISOString().split('T')[0] : "",
      position: employee?.position || "",
      role: (employee?.role as "SUPER_ADMIN" | "STORE_MANAGER" | "EMPLOYEE") || "EMPLOYEE",
      storeId: employee?.storeId || undefined,
      isActive: employee?.isActive ?? true,
      imageUrl: employee?.imageUrl || "",
    },
  })

  async function onSubmit(data: EmployeeFormValues) {
    try {
      if (isEditing && employee) {
        await updateEmployee(employee.id, data)
        toast.success("Сотрудник обновлен")
      } else {
        await createEmployee(data)
        toast.success("Сотрудник создан")
      }
      setOpen(false)
      form.reset()
    } catch (error) {
      toast.error("Ошибка сохранения")
    }
  }

  const handleDocumentUpload = async (url?: string, name?: string, size?: number, type?: string) => {
    if (!employee || !url || !name || !size || !type) return
    setDocLoading('upload')
    try {
      await addDocument(employee.id, { name, url, size, type })
      toast.success("Документ добавлен")
    } catch (error) {
      toast.error("Ошибка добавления документа")
    } finally {
      setDocLoading(null)
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    setDocLoading(docId)
    try {
      await deleteDocument(docId)
      toast.success("Документ удален")
    } catch (error) {
      toast.error("Ошибка удаления документа")
    } finally {
      setDocLoading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Добавить сотрудника
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] md:max-w-[700px] max-h-[85vh] gap-0 p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
          <DialogTitle className="text-lg sm:text-xl">
            {isEditing ? "Редактировать сотрудника" : "Новый сотрудник"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 pt-4 sm:pt-6">
              {/* Фото профиля */}
              <div className="flex flex-col items-center gap-2 border rounded-lg p-3 sm:p-4 bg-muted/20">
                <FormLabel className="text-sm font-medium text-center w-full">
                  Фото профиля
                </FormLabel>
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-background shadow-sm">
                  <AvatarImage src={form.watch("imageUrl") || undefined} />
                  <AvatarFallback className="text-base sm:text-lg font-semibold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
                    {form.watch("firstName")?.[0] || "?"}{form.watch("lastName")?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
                {form.watch("imageUrl") ? (
                  <div className="text-center w-full">
                    <p className="text-xs text-green-600 dark:text-green-400 mb-2 font-medium">
                      ✓ Фото загружено
                    </p>
                    <FileUpload 
                      endpoint="imageUploader"
                      onChange={(url) => form.setValue("imageUrl", url)}
                    />
                  </div>
                ) : (
                  <div className="w-full">
                    <FileUpload 
                      endpoint="imageUploader"
                      onChange={(url) => form.setValue("imageUrl", url)}
                    />
                  </div>
                )}
              </div>
              
              {/* Webcam Capture */}
              <div className="flex justify-center">
                 {!isCameraOpen ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCameraOpen(true)}
                      className="gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Сделать фото
                    </Button>
                 ) : (
                    <div className="space-y-2 w-full max-w-sm">
                      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                        <Webcam
                          audio={false}
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          className="w-full h-full object-cover"
                          videoConstraints={{ facingMode: "user" }}
                        />
                      </div>
                      <div className="flex gap-2 justify-center">
                        <Button type="button" onClick={capture} disabled={isUploading}>
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Снять"}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setIsCameraOpen(false)}>
                          Отмена
                        </Button>
                      </div>
                    </div>
                 )}
              </div>

              {/* Поля формы */}
              <div className="space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Имя</FormLabel>
                      <FormControl>
                        <Input placeholder="Иван" className="h-10 text-sm sm:text-base" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Фамилия</FormLabel>
                      <FormControl>
                        <Input placeholder="Иванов" className="h-10 text-sm sm:text-base" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="middleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Отчество</FormLabel>
                      <FormControl>
                        <Input placeholder="Иванович" className="h-10 text-sm sm:text-base" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Контакты */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Телефон</FormLabel>
                      <FormControl>
                        <Input placeholder="+998 90 123 45 67" className="h-10 text-sm sm:text-base" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="ivan@example.com" className="h-10 text-sm sm:text-base" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Персональные данные */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Дата рождения</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-10 text-sm sm:text-base" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Должность</FormLabel>
                      <FormControl>
                        <Input placeholder="Менеджер" className="h-10 text-sm sm:text-base" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Роль и магазин */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Роль</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Выберите роль" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EMPLOYEE">Сотрудник</SelectItem>
                          <SelectItem value="STORE_MANAGER">Менеджер магазина</SelectItem>
                          <SelectItem value="SUPER_ADMIN">Администратор</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="storeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Магазин</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                        defaultValue={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Выберите магазин" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Без привязки</SelectItem>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Логин и Пароль */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg bg-muted/10">
                <FormField
                  control={form.control}
                  name="login"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Логин для посещаемости</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="user123" 
                          className="h-10 text-sm sm:text-base" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        {isEditing ? "Новый пароль" : "Пароль"}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder={isEditing ? "••••••" : "Введите пароль"} 
                          className="h-10 text-sm sm:text-base" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full text-sm sm:text-base h-10 sm:h-11" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить
              </Button>
            </form>
          </Form>

          {isEditing && employee && (
            <div className="border-t pt-4 sm:pt-6 mt-4 sm:mt-6 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                <h3 className="font-semibold text-base sm:text-lg">Документы</h3>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="relative">
                  {docLoading === 'upload' && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-blue-600" />
                        <span className="text-xs sm:text-sm text-muted-foreground">Загрузка...</span>
                      </div>
                    </div>
                  )}
                  <FileUpload 
                    endpoint="documentUploader"
                    onChange={handleDocumentUpload}
                  />
                </div>
                
                <div className="border rounded-lg">
                  <div className="max-h-[160px] sm:max-h-[200px] overflow-y-auto p-2 sm:p-3 space-y-2">
                    {employee.documents?.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          {doc.type.includes("image") ? (
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-md bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-md bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="font-medium text-xs sm:text-sm truncate block hover:text-blue-600 hover:underline transition-colors"
                          >
                            {doc.name}
                          </a>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {(doc.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 hover:bg-red-100 dark:hover:bg-red-900/20"
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={docLoading === doc.id}
                        >
                          {docLoading === doc.id ? (
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    ))}
                    {(!employee.documents || employee.documents.length === 0) && (
                      <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted flex items-center justify-center mb-2 sm:mb-3">
                          <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Нет загруженных документов
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
