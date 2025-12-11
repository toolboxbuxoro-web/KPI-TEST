'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Loader2, ScanLine, UserCheck, UserMinus, Clock, Camera, RefreshCw, ScanFace, AlertCircle, CheckCircle2, XCircle, Store, Lock, LogOut } from 'lucide-react'
import Webcam from 'react-webcam'
import * as faceapi from 'face-api.js'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { registerAttendance, getAllTodayAttendance } from '@/app/actions/attendance'
import { getEmployee } from '@/app/actions/employee'
import { getAllFaceDescriptors } from '@/app/actions/face-recognition'
import { getAllStores, getStoreName } from '@/app/actions/store'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface StoreOption {
  id: string
  name: string
}

type ScanStep = 'loading' | 'scanning' | 'success'

interface AttendanceScannerProps {
  preselectedStoreId?: string
  onResetStore?: () => void
}

export function AttendanceScanner({ preselectedStoreId, onResetStore }: AttendanceScannerProps) {
  const [fetchedStoreName, setFetchedStoreName] = useState<string | null>(null)
  const [scanMode, setScanMode] = useState<'in' | 'out' | null>(null)
  const [stores, setStores] = useState<StoreOption[]>([])

  // Fetch individual store name if preselected (fallback)
  useEffect(() => {
    if (preselectedStoreId) {
        getStoreName(preselectedStoreId).then(name => {
            if (name) setFetchedStoreName(name)
        })
    }
  }, [preselectedStoreId])

  const [selectedStoreId, setSelectedStoreId] = useState<string>(preselectedStoreId || '')
  const [step, setStep] = useState<ScanStep>('loading')
  const [isLoading, setIsLoading] = useState(false)
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [employee, setEmployee] = useState<any>(null)
  const [verificationStatus, setVerificationStatus] = useState<string>('Загрузка системы...')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  
  const webcamRef = useRef<Webcam>(null)
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)

  // New state for UI Feedback Overlay
  const [resultOverlay, setResultOverlay] = useState<{
    type: 'success' | 'error' | 'already'
    message: string
    employee?: any
  } | null>(null)
  
  // Ref for counting unknown attempts
  const unknownAttemptsRef = useRef(0)
  const [activeTab, setActiveTab] = useState<'scanner' | 'list'>('scanner')


  useEffect(() => {
     setSelectedStoreId(preselectedStoreId || '')
     if (preselectedStoreId) {
        // ... any side effects for having a store
     } else {
        setFetchedStoreName(null)
     }
  }, [preselectedStoreId])

  /**
   * Инициализация системы распознавания лиц.
   * 
   * Этапы загрузки:
   * 1. ssdMobilenetv1 — модель детектирования лиц в кадре
   * 2. faceLandmark68Net — модель определения 68 ключевых точек лица
   * 3. faceRecognitionNet — модель создания уникального "отпечатка" (дескриптора) лица
   * 4. Загрузка дескрипторов всех сотрудников из базы данных
   * 5. Создание FaceMatcher с порогом сходства 0.45 (чем ниже — тем строже)
   */
  useEffect(() => {
    // Проверка поддержки браузером API камеры
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Ваш браузер не поддерживает доступ к камере или соединение не защищено (требуется HTTPS).")
      setVerificationStatus("Ошибка совместимости")
      return
    }
    
    setIsSupported(true)

    const initSystem = async () => {
      try {
        setVerificationStatus('Загрузка моделей ИИ...')
        const MODEL_URL = '/models'
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        setModelsLoaded(true)
        setLoadingProgress(30)

        setVerificationStatus('Загрузка базы лиц...')
        
        // Fast path: load pre-computed descriptors from database
        const descriptors = await getAllFaceDescriptors()
        setLoadingProgress(70)
        
        if (descriptors.length === 0) {
            setVerificationStatus('Нет сотрудников с биометрией')
            setStep('scanning')
            return
        }

        // Build face matcher from stored descriptors (instant!)
        const labeledDescriptors = descriptors.map(d => 
            new faceapi.LabeledFaceDescriptors(
                d.id, 
                [new Float32Array(d.descriptor)]
            )
        )
        
        setLoadingProgress(90)

        if (labeledDescriptors.length > 0) {
            setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.45)) // Relaxed from 0.4 for better usability
            setVerificationStatus(`Система готова (${labeledDescriptors.length} сотр.)`)
            setStep('scanning')
        } else {
            setVerificationStatus('Не удалось создать базу лиц')
            setStep('scanning')
        }

        // Load stores
        try {
          const storesList = await getAllStores()
          setStores(storesList)
          if (!preselectedStoreId && storesList.length > 0) {
            setSelectedStoreId(storesList[0].id)
          }
        } catch (e) {
          console.error('Failed to load stores', e)
        }

      } catch (error) {
        console.error("Failed to init system", error)
        toast.error("Ошибка инициализации системы")
        setStep('scanning')
      }
    }
    initSystem()
  }, [preselectedStoreId])

  const fetchLogs = async () => {
    try {
      const logs = await getAllTodayAttendance(selectedStoreId || undefined)
      setRecentLogs(logs)
    } catch (error) {
      console.error("Failed to fetch logs", error)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 30000)
    return () => clearInterval(interval)
  }, [selectedStoreId])

  // Карта cooldown для предотвращения повторных сканирований (employeeId -> timestamp)
  const [lastScanned, setLastScanned] = useState<Record<string, number>>({})
  // Ref для немедленной блокировки (без ожидания ререндера)
  const isProcessingRef = useRef(false)

  /**
   * Главный цикл обработки видеопотока (вызывается 10 раз в секунду).
   * 
   * Процесс работы:
   * 1. Захватывает скриншот с веб-камеры (JPEG)
   * 2. Передает изображение в face-api.js для детектирования лица
   * 3. Проверяет качество — лицо должно быть >= 100px в ширину
   * 4. Извлекает 128-мерный дескриптор лица
   * 5. Сравнивает с базой данных через FaceMatcher.findBestMatch()
   * 6. При совпадении (distance < 0.45) регистрирует посещение
   * 
   * Защита от спама: повторное распознавание того же сотрудника
   * блокируется на 60 секунд (см. lastScanned).
   */
  const processFrame = async () => {
    // Block if already processing or showing result
    if (isProcessingRef.current || resultOverlay) return
    
    if (!webcamRef.current || !modelsLoaded || step !== 'scanning') return
    
    const imageSrc = webcamRef.current.getScreenshot()
    if (!imageSrc) return

    try {
        const webcamImg = await faceapi.fetchImage(imageSrc)
        const detection = await faceapi.detectSingleFace(webcamImg, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 })).withFaceLandmarks().withFaceDescriptor()

        if (!detection) {
            // Only update status if we are not in a failure sequence
            if (unknownAttemptsRef.current === 0) {
                 setVerificationStatus('Поиск лица...')
            }
            return
        }

         // Quality check
        const box = detection.detection.box
        if (box.width < 100) {
            setVerificationStatus('Ближе к камере')
            return
        }

        if (step === 'scanning' && faceMatcher) {
            const match = faceMatcher.findBestMatch(detection.descriptor)
            
            if (match.label !== 'unknown') {
                // SUCCESS MATCH
                unknownAttemptsRef.current = 0 // Reset attempts
                
                if (isProcessingRef.current) return
                isProcessingRef.current = true

                // Cooldown check (prevent spam)
                const scanKey = `${match.label}-${scanMode}`
                const now = Date.now()
                if (lastScanned[scanKey] && now - lastScanned[scanKey] < 60000) {
                   setVerificationStatus(`Подождите...`)
                   isProcessingRef.current = false
                   return
                }
                
                setVerificationStatus(`Распознан: ${match.label}`)
                
                // Fetch full employee data
                try {
                    const emp = await getEmployee(match.label)
                    if (emp && !('error' in emp)) {
                        setEmployee(emp)
                        await processAttendance(emp)
                    } else {
                         throw new Error("Employee not found")
                    }
                } catch (err) {
                    console.error(err)
                    isProcessingRef.current = false
                }
            } else {
                // UNKNOWN MATCH - Increment attempts
                unknownAttemptsRef.current += 1
                setVerificationStatus(`Не распознан (${unknownAttemptsRef.current}/3)`)
                
                if (unknownAttemptsRef.current >= 3) {
                     isProcessingRef.current = true // Stop scanning
                     setResultOverlay({ type: 'error', message: 'Не удалось распознать' })
                     
                     setTimeout(() => {
                        handleScanComplete()
                     }, 2000)
                }
            }
        }

    } catch (e) {
        console.error(e)
        isProcessingRef.current = false
    }
  }

  // Helper to reset and exit
  const handleScanComplete = () => {
      setResultOverlay(null)
      setScanMode(null) // Go back to menu
      isProcessingRef.current = false
      unknownAttemptsRef.current = 0
      setEmployee(null)
      setVerificationStatus('Готово')
  }

  // Loop trigger
  // Loop trigger
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (modelsLoaded && step === 'scanning' && scanMode && !resultOverlay) {
        // Run every 800ms to allow "attempts" to be readable events
        interval = setInterval(processFrame, 800)
    }
    return () => clearInterval(interval)
  }, [modelsLoaded, step, faceMatcher, scanMode, resultOverlay])


  async function processAttendance(empData: any) {
    const targetEmployee = empData
    if (!targetEmployee || !scanMode) return
    
    try {
      const result = await registerAttendance(targetEmployee.id, scanMode, selectedStoreId || undefined)
      
      // Update cooldown map on success
      if (result.success) {
           const scanKey = `${targetEmployee.id}-${scanMode}`
           setLastScanned(prev => ({...prev, [scanKey]: Date.now()}))
           setResultOverlay({ 
               type: 'success', 
               message: result.message || 'Успешно', 
               employee: targetEmployee 
           })
           fetchLogs()
      } else {
           // Handle specific statuses
           if (result.status === 'ALREADY_CHECKED_IN' || result.status === 'ALREADY_CHECKED_OUT') {
               setResultOverlay({ 
                   type: 'already', 
                   message: result.error || 'Уже отмечено', 
                   employee: targetEmployee 
               })
           } else {
               setResultOverlay({ 
                   type: 'error', 
                   message: result.error || 'Ошибка' 
               })
           }
      }

      // Automatically close after delay
      setTimeout(() => {
          handleScanComplete()
      }, 2500)
      
    } catch (error) {
       console.error(error)
       setResultOverlay({ type: 'error', message: "Ошибка сети" })
       setTimeout(handleScanComplete, 2500)
    }
  }

  const handleUserMediaError = (error: string | DOMException) => {
    console.error("Camera error:", error)
    let errorMessage = "Ошибка доступа к камере"
    
    if (typeof error === 'object' && 'name' in error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = "Доступ к камере запрещен"
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = "Камера не найдена"
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage = "Камера занята"
        } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
             errorMessage = "Требуется HTTPS"
        }
    }
    
    setCameraError(errorMessage)
    setVerificationStatus("Ошибка камеры")
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      {/* Mobile View Toggles */}
      <div className="lg:hidden flex mb-4 bg-muted/50 p-1 rounded-xl">
        <Button 
           variant={activeTab === 'scanner' ? 'default' : 'ghost'} 
           className={`flex-1 rounded-lg ${activeTab === 'scanner' ? 'shadow-sm' : ''}`}
           onClick={() => setActiveTab('scanner')}
        >
           <ScanFace className="mr-2 h-4 w-4" />
           Терминал
        </Button>
        <Button 
           variant={activeTab === 'list' ? 'default' : 'ghost'} 
           className={`flex-1 rounded-lg ${activeTab === 'list' ? 'shadow-sm' : ''}`}
           onClick={() => setActiveTab('list')}
        >
           <Clock className="mr-2 h-4 w-4" />
           Активность
        </Button>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0">
        {/* Left Panel: Scanner */}
        <Card className={`lg:col-span-7 flex flex-col overflow-hidden neo-card neo-float h-full lg:max-h-[calc(100vh-10rem)] ${activeTab === 'list' ? 'hidden lg:flex' : 'flex'}`}>
          <CardHeader className="pb-4 border-b bg-card/50 backdrop-blur-sm z-10 flex flex-row items-center justify-between h-auto min-h-[5rem] px-6">
              <div className="space-y-1">
                  {preselectedStoreId ? (
                      <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                          <CardTitle className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                              <Store className="h-8 w-8" />
                              {stores.find(s => s.id === selectedStoreId)?.name || fetchedStoreName || (stores.length === 0 ? 'Загрузка магазина...' : 'Магазин не найден')}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 text-base mt-1">
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary w-fit">
                                  <Lock className="h-3 w-3" />
                                  <span className="text-xs font-semibold">Терминал активен</span>
                              </div>
                              <span className="text-muted-foreground text-sm">Система учета времени</span>
                          </CardDescription>
                      </div>
                  ) : (
                      <div>
                          <CardTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
                               <ScanFace className="h-6 w-6 text-muted-foreground" />
                               Настройка терминала
                          </CardTitle>
                          <CardDescription>
                              Выберите магазин для начала работы
                          </CardDescription>
                      </div>
                  )}
              </div>

              <div className="flex items-center gap-4">
                  {preselectedStoreId ? (
                       <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                              setSelectedStoreId('')
                              if (onResetStore) onResetStore()
                          }} 
                          className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors" 
                          title="Выйти из режима терминала"
                       >
                          <LogOut className="h-5 w-5" />
                       </Button>
                  ) : (
                      <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                        <SelectTrigger className="w-[200px] bg-background border-input shadow-sm">
                          <SelectValue placeholder="Выберите магазин" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  )}
              </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 relative bg-black/5 dark:bg-black/40">
            {step === 'loading' ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12">
                  <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                      <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
                  </div>
                  <div className="w-full max-w-md space-y-3 text-center">
                      <h3 className="text-lg font-medium">{verificationStatus}</h3>
                      <Progress value={loadingProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground">Загрузка нейросетевых моделей и биометрических данных...</p>
                  </div>
              </div>
            ) : !scanMode ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 gap-4 sm:gap-8 animate-in fade-in duration-500">
                  {/* Адаптивная сетка: 2 колонки на всех экранах, меньшие отступы на мобильных */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-6 w-full max-w-2xl h-full max-h-[250px] sm:max-h-[400px]">
                      <Button 
                          variant="outline" 
                          className="h-full flex flex-col gap-3 sm:gap-6 hover:bg-green-500/5 hover:border-green-500/50 hover:text-green-600 dark:hover:text-green-400 transition-all group border-2 rounded-2xl p-4 sm:p-6"
                          onClick={() => setScanMode('in')}
                      >
                          <div className="p-3 sm:p-6 rounded-full bg-green-100 dark:bg-green-900/20 group-hover:scale-110 transition-transform duration-300">
                              <UserCheck className="h-10 w-10 sm:h-16 sm:w-16 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="space-y-1">
                              <span className="text-xl sm:text-3xl font-bold">ВХОД</span>
                              <p className="text-xs sm:text-base text-muted-foreground group-hover:text-green-600/80 dark:group-hover:text-green-400/80 hidden sm:block">Начать рабочий день</p>
                          </div>
                      </Button>

                      <Button 
                          variant="outline" 
                          className="h-full flex flex-col gap-3 sm:gap-6 hover:bg-orange-500/5 hover:border-orange-500/50 hover:text-orange-600 dark:hover:text-orange-400 transition-all group border-2 rounded-2xl p-4 sm:p-6"
                          onClick={() => setScanMode('out')}
                      >
                          <div className="p-3 sm:p-6 rounded-full bg-orange-100 dark:bg-orange-900/20 group-hover:scale-110 transition-transform duration-300">
                              <UserMinus className="h-10 w-10 sm:h-16 sm:w-16 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="space-y-1">
                              <span className="text-xl sm:text-3xl font-bold">ВЫХОД</span>
                              <p className="text-xs sm:text-base text-muted-foreground group-hover:text-orange-600/80 dark:group-hover:text-orange-400/80 hidden sm:block">Завершить работу</p>
                          </div>
                      </Button>
                  </div>
              </div>
            ) : (
              <div className="flex-1 relative flex flex-col">
                  {/* Camera Header */}
                  <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
                      <Badge 
                          variant={scanMode === 'in' ? "default" : "destructive"} 
                          className="text-base px-4 py-1.5 shadow-lg backdrop-blur-md"
                      >
                          {scanMode === 'in' ? "РЕЖИМ: ВХОД" : "РЕЖИМ: ВЫХОД"}
                      </Badge>
                      <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => setScanMode(null)}
                          className="shadow-lg backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border-white/20"
                      >
                          <XCircle className="mr-2 h-4 w-4" />
                          Отмена
                      </Button>
                  </div>

                  {/* Camera Viewport */}
                  <div className="relative overflow-hidden bg-black flex items-center justify-center aspect-video max-h-[50vh]">
                      {isSupported && !cameraError && (
                          <Webcam
                              audio={false}
                              ref={webcamRef}
                              screenshotFormat="image/jpeg"
                              className="w-full h-full object-contain"
                              videoConstraints={{ 
                                  width: 1280,
                                  height: 720,
                                  facingMode: "user" 
                              }}
                              mirrored={true}
                              onUserMediaError={handleUserMediaError}
                          />
                      )}
                      
                      {/* Error State */}
                      {cameraError && (
                          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center z-50">
                              <div className="bg-red-500/10 p-6 rounded-full mb-6">
                                  <AlertCircle className="h-16 w-16 text-red-500" />
                              </div>
                              <h3 className="text-xl font-bold text-white mb-2">Ошибка доступа к камере</h3>
                              <p className="text-gray-400 mb-8 max-w-md">{cameraError}</p>
                              <Button onClick={() => window.location.reload()} variant="secondary" size="lg">
                                  <RefreshCw className="mr-2 h-5 w-5" />
                                  Перезагрузить страницу
                              </Button>
                          </div>
                      )}
                      
                      {/* RESULT OVERLAY - NEW */}
                      {resultOverlay && (
                           <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                               <Card className={`max-w-sm w-full border-0 shadow-2xl ${
                                   resultOverlay?.type === 'success' ? 'bg-green-500/10 border-green-500/50' :
                                   resultOverlay?.type === 'already' ? 'bg-orange-500/10 border-orange-500/50' : 
                                   'bg-red-500/10 border-red-500/50'
                               } border-2`}>
                                   <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                                       
                                       {resultOverlay?.employee && (
                                           <Avatar className="h-24 w-24 border-4 border-background shadow-xl mb-2">
                                               <AvatarImage src={resultOverlay?.employee.imageUrl} />
                                               <AvatarFallback className="text-2xl">{resultOverlay?.employee.firstName[0]}</AvatarFallback>
                                           </Avatar>
                                       )}

                                       <div className={`p-4 rounded-full ${
                                           resultOverlay?.type === 'success' ? 'bg-green-500 text-white' :
                                           resultOverlay?.type === 'already' ? 'bg-orange-500 text-white' :
                                           'bg-red-500 text-white'
                                       }`}>
                                           {resultOverlay?.type === 'success' && <CheckCircle2 className="h-8 w-8" />}
                                           {resultOverlay?.type === 'already' && <AlertCircle className="h-8 w-8" />}
                                           {resultOverlay?.type === 'error' && <XCircle className="h-8 w-8" />}
                                       </div>

                                       <div className="space-y-1">
                                           <h2 className="text-2xl font-bold text-white">
                                               {resultOverlay?.employee 
                                                   ? `${resultOverlay?.employee.firstName} ${resultOverlay?.employee.lastName}`
                                                   : (resultOverlay?.type === 'error' ? 'Ошибка' : resultOverlay?.type)
                                               }
                                           </h2>
                                           <p className="text-lg text-white/90 font-medium">
                                               {resultOverlay?.message}
                                           </p>
                                       </div>
                                   </CardContent>
                               </Card>
                           </div>
                      )}

                      {/* Scanning Face Frame */}
                      {!resultOverlay && !cameraError && (
                           <div className={`absolute inset-0 border-[6px] transition-colors duration-300 z-10 ${
                               verificationStatus.includes('Распознан') ? 'border-green-500/80' : 'border-white/10'
                           }`}>
                               {/* Attempts counter in center if verifying */}
                               {unknownAttemptsRef.current > 0 && (
                                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform">
                                        <div className="text-6xl font-bold text-white/50 animate-pulse">
                                            {unknownAttemptsRef.current}
                                        </div>
                                   </div>
                               )}
                           </div>
                      )}

                      {/* Scanning Animation */}
                      {!employee && !cameraError && !resultOverlay && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                              <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 border-2 border-white/30 rounded-lg relative">
                                  <div className="absolute top-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-t-4 border-l-4 border-primary -mt-1 -ml-1" />
                                  <div className="absolute top-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-t-4 border-r-4 border-primary -mt-1 -mr-1" />
                                  <div className="absolute bottom-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-b-4 border-l-4 border-primary -mb-1 -ml-1" />
                                  <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-b-4 border-r-4 border-primary -mb-1 -mr-1" />
                                  <ScanLine className="absolute inset-0 m-auto h-full w-full text-primary/20 animate-pulse" />
                              </div>
                          </div>
                      )}
                      
                      {/* Status Badge */}
                      {!resultOverlay && (
                          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
                              <div className={`px-6 py-2 rounded-full backdrop-blur-md border shadow-xl transition-all duration-300 ${
                                  verificationStatus.includes('Распознан') 
                                      ? 'bg-green-500/20 border-green-500/50 text-green-100' 
                                      : verificationStatus.includes('Не распознан')
                                      ? 'bg-red-500/20 border-red-500/50 text-red-100'
                                      : 'bg-black/60 border-white/10 text-white'
                              }`}>
                                  <span className="font-medium flex items-center gap-2">
                                      {verificationStatus.includes('Распознан') && <CheckCircle2 className="h-4 w-4" />}
                                      {verificationStatus}
                                  </span>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Recent Activity */}
        <Card className={`lg:col-span-5 flex-col h-full neo-card neo-float lg:flex ${activeTab === 'list' ? 'flex' : 'hidden'}`}>
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Активность за сегодня
            </CardTitle>
            <CardDescription>
              Последние действия сотрудников
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                  {recentLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
                          <div className="bg-muted rounded-full p-4">
                              <Clock className="h-8 w-8 opacity-50" />
                          </div>
                          <p>Записей пока нет</p>
                      </div>
                  ) : (
                      recentLogs.map((log) => (
                          <div key={log.id} className="group flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 hover:shadow-md transition-all duration-200">
                              <Avatar className="h-12 w-12 border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
                                  <AvatarImage src={log.employee.imageUrl} />
                                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                      {log.employee.firstName[0]}{log.employee.lastName[0]}
                                  </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                      <p className="font-semibold truncate">
                                          {log.employee.firstName} {log.employee.lastName}
                                      </p>
                                      <span className="text-xs text-muted-foreground font-mono">
                                          {new Date(log.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-3 truncate">{log.employee.position}</p>
                                  
                                  <div className="flex flex-wrap gap-2">
                                      <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-200 dark:border-green-900">
                                          Вход: {new Date(log.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </Badge>
                                      {log.checkOut && (
                                          <Badge variant="outline" className="bg-orange-500/5 text-orange-600 border-orange-200 dark:border-orange-900">
                                              Выход: {new Date(log.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          </Badge>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t bg-muted/20 p-4">
              <div className="w-full flex justify-between text-xs text-muted-foreground">
                  <span>Всего записей: {recentLogs.length}</span>
                  <span>Обновлено: {new Date().toLocaleTimeString()}</span>
              </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
