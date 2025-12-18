'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Loader2, ScanLine, UserCheck, UserMinus, Clock, Camera, RefreshCw, ScanFace, AlertCircle, CheckCircle2, XCircle, Store, Lock, LogOut, Trophy, Medal } from 'lucide-react'
import Webcam from 'react-webcam'
import * as faceapi from 'face-api.js'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { registerAttendance, getAllTodayAttendance } from '@/app/actions/attendance'
import { getEmployee } from '@/app/actions/employee'
import { getAllFaceDescriptors } from '@/app/actions/face-recognition'
import { getAllStores, getStoreName } from '@/app/actions/store'
import { getCachedDescriptors, setCachedDescriptors } from '@/lib/descriptor-cache'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TodayActivityList } from "@/components/admin/TodayActivityList"

interface StoreOption {
  id: string
  name: string
}

type ScanStep = 'loading' | 'scanning' | 'success'

interface AttendanceScannerProps {
  preselectedStoreId?: string
  preselectedStoreName?: string
  kioskAccessToken?: string
  onResetStore?: () => void
}

export function AttendanceScanner({ preselectedStoreId, preselectedStoreName, kioskAccessToken, onResetStore }: AttendanceScannerProps) {
  const [fetchedStoreName, setFetchedStoreName] = useState<string | null>(null)
  const [scanMode, setScanMode] = useState<'in' | 'out' | null>(null)
  const [stores, setStores] = useState<StoreOption[]>([])
  const [kioskToken, setKioskToken] = useState<string | null>(kioskAccessToken || null)
  const isKioskApiMode = Boolean(preselectedStoreId && kioskToken)

  // Fetch individual store name if preselected (fallback)
  useEffect(() => {
    if (preselectedStoreId) {
        const savedName = preselectedStoreName || localStorage.getItem('toolbox_kiosk_store_name')
        if (savedName) setFetchedStoreName(savedName)
        // Avoid server actions in kiosk API mode; keep as legacy fallback only.
        if (!savedName && !isKioskApiMode) {
          getStoreName(preselectedStoreId).then(name => {
              if (name) setFetchedStoreName(name)
          })
        }
    }
  }, [preselectedStoreId, preselectedStoreName, isKioskApiMode])

  // Keep token in sync (prop -> state) and support refresh (read from localStorage)
  useEffect(() => {
    if (kioskAccessToken) {
      setKioskToken(kioskAccessToken)
      return
    }
    const savedToken = localStorage.getItem('toolbox_kiosk_access_token')
    if (savedToken) setKioskToken(savedToken)
  }, [kioskAccessToken])

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
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
  
  // AbortController refs for kiosk fetches to prevent race conditions
  const fetchLogsAbortControllerRef = useRef<AbortController | null>(null)
  const initAbortControllerRef = useRef<AbortController | null>(null)


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
        
        // Helper function to build FaceMatcher from descriptors
        const buildFaceMatcher = (descriptors: Array<{ id: string; descriptor: number[] }>) => {
          if (descriptors.length === 0) return null
          const labeledDescriptors = descriptors.map(d => 
            new faceapi.LabeledFaceDescriptors(
              d.id, 
              [new Float32Array(d.descriptor)]
            )
          )
          return new faceapi.FaceMatcher(labeledDescriptors, 0.45)
        }

        // Helper function to load descriptors (kiosk mode only - uses cache)
        const loadDescriptorsWithCache = async () => {
          if (!isKioskApiMode) {
            // Admin mode: no cache, just fetch directly
            return await getAllFaceDescriptors()
          }

          // Kiosk mode: try cache first, then fetch fresh in background
          const cached = await getCachedDescriptors()
          
          if (cached && cached.descriptors.length > 0) {
            // Use cache immediately
            setVerificationStatus(`Система готова (кеш, ${cached.descriptors.length} сотр.)`)
            const matcher = buildFaceMatcher(cached.descriptors)
            if (matcher) {
              setFaceMatcher(matcher)
              setLoadingProgress(90)
              setStep('scanning')
            }

            // Fetch fresh descriptors in background
            try {
              const abortController = new AbortController()
              initAbortControllerRef.current = abortController
              
              const res = await fetch('/api/kiosk/face-descriptors', {
                headers: { Authorization: `Bearer ${kioskToken}` },
                signal: abortController.signal,
              })
              if (res.ok) {
                const data = await res.json()
                const serverVersion = res.headers.get('x-face-descriptors-version') || data.version || '0'
                
                // Update if version changed
                if (serverVersion !== cached.version) {
                  const freshDescriptors = data.descriptors || data
                  if (Array.isArray(freshDescriptors) && freshDescriptors.length > 0) {
                    await setCachedDescriptors(freshDescriptors, serverVersion)
                    const updatedMatcher = buildFaceMatcher(freshDescriptors)
                    if (updatedMatcher) {
                      setFaceMatcher(updatedMatcher)
                      setVerificationStatus(`Система обновлена (${freshDescriptors.length} сотр.)`)
                    }
                  }
                }
              }
            } catch (error) {
              // Ignore abort errors and network errors - cache is still working
              if (error instanceof Error && error.name !== 'AbortError') {
                console.warn('Background descriptor update failed:', error)
              }
            }
            
            return cached.descriptors
          } else {
            // No cache: fetch from server
            const abortController = new AbortController()
            initAbortControllerRef.current = abortController
            
            const res = await fetch('/api/kiosk/face-descriptors', {
              headers: { Authorization: `Bearer ${kioskToken}` },
              signal: abortController.signal,
            })
            if (!res.ok) throw new Error(`Failed to load kiosk descriptors (${res.status})`)
            
            const data = await res.json()
            const descriptors = data.descriptors || data
            const version = res.headers.get('x-face-descriptors-version') || data.version || '0'
            
            // Save to cache
            if (Array.isArray(descriptors) && descriptors.length > 0) {
              await setCachedDescriptors(descriptors, version)
            }
            
            return descriptors
          }
        }

        const descriptors = await loadDescriptorsWithCache()
        setLoadingProgress(70)
        
        if (!descriptors || descriptors.length === 0) {
          setVerificationStatus('Нет сотрудников с биометрией')
          setStep('scanning')
          return
        }

        // Build face matcher if not already built from cache
        if (!faceMatcher) {
          const labeledDescriptors = descriptors.map(d => 
            new faceapi.LabeledFaceDescriptors(
              d.id, 
              [new Float32Array(d.descriptor)]
            )
          )
          
          setLoadingProgress(90)

          if (labeledDescriptors.length > 0) {
            setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.45))
            setVerificationStatus(`Система готова (${labeledDescriptors.length} сотр.)`)
            setStep('scanning')
          } else {
            setVerificationStatus('Не удалось создать базу лиц')
            setStep('scanning')
          }
        }

        // Load stores (admin mode only)
        if (!preselectedStoreId) {
          try {
            const storesList = await getAllStores()
            setStores(storesList)
            if (storesList.length > 0) {
              setSelectedStoreId(storesList[0].id)
            }
          } catch (e) {
            console.error('Failed to load stores', e)
          }
        }

      } catch (error) {
        console.error("Failed to init system", error)
        toast.error("Ошибка инициализации системы")
        setStep('scanning')
      }
    }
    initSystem()
    
    // Cleanup: abort any pending fetch when dependencies change or component unmounts
    return () => {
      if (initAbortControllerRef.current) {
        initAbortControllerRef.current.abort()
        initAbortControllerRef.current = null
      }
    }
  }, [preselectedStoreId, isKioskApiMode, kioskToken])

  const fetchLogs = async (abortSignal?: AbortSignal) => {
    try {
      if (isKioskApiMode) {
        const url = selectedStoreId
          ? `/api/kiosk/today-attendance?storeId=${encodeURIComponent(selectedStoreId)}`
          : `/api/kiosk/today-attendance`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${kioskToken}` },
          signal: abortSignal,
        })
        if (!res.ok) throw new Error(`Failed to fetch kiosk logs (${res.status})`)
        const logs = await res.json()
        setRecentLogs(logs)
      } else {
        const logs = await getAllTodayAttendance(selectedStoreId || undefined)
        setRecentLogs(logs)
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error("Failed to fetch logs", error)
    }
  }

  useEffect(() => {
    // Abort any pending fetch
    if (fetchLogsAbortControllerRef.current) {
      fetchLogsAbortControllerRef.current.abort()
    }
    
    // Create new AbortController for this effect cycle
    const abortController = new AbortController()
    fetchLogsAbortControllerRef.current = abortController
    
    fetchLogs(abortController.signal)
    const interval = setInterval(() => fetchLogs(abortController.signal), 30000)
    
    return () => {
      clearInterval(interval)
      abortController.abort()
      fetchLogsAbortControllerRef.current = null
    }
  }, [selectedStoreId, isKioskApiMode, kioskToken])

  // Карта cooldown для предотвращения повторных сканирований (employeeId -> timestamp)
  const lastScannedRef = useRef<Record<string, number>>({})
  // Ref для немедленной блокировки (без ожидания ререндера)
  const isProcessingRef = useRef(false)
  // Ref для предотвращения параллельных инференсов
  const frameInFlightRef = useRef(false)

  /**
   * Главный цикл обработки видеопотока (оптимизирован для скорости).
   * 
   * Процесс работы:
   * 1. Захватывает кадр напрямую с видеоэлемента через offscreen canvas (без screenshot)
   * 2. Передает canvas в face-api.js для детектирования лица
   * 3. Проверяет качество — относительный размер лица (нормализован под downscale)
   * 4. Извлекает 128-мерный дескриптор лица
   * 5. Сравнивает с базой данных через FaceMatcher.findBestMatch()
   * 6. При совпадении (distance < 0.45) регистрирует посещение
   * 
   * Защита от спама: повторное распознавание того же сотрудника
   * блокируется на 60 секунд (см. lastScanned).
   * Защита от параллельных инференсов: frameInFlightRef предотвращает запуск
   * нового процесса до завершения предыдущего.
   */
  const processFrame = async () => {
    // Block if already processing, frame in flight, or showing result
    if (isProcessingRef.current || frameInFlightRef.current || resultOverlay) return
    
    if (!webcamRef.current || !modelsLoaded || step !== 'scanning') return
    
    const video = webcamRef.current.video
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Set frame guard immediately
    frameInFlightRef.current = true

    try {
        // Initialize offscreen canvas if needed (480x270 for performance)
        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas')
            canvasRef.current.width = 480
            canvasRef.current.height = 270
        }
        
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            frameInFlightRef.current = false
            return
        }

        // Draw video frame to canvas (downscaled for speed)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Use canvas directly with face-api.js (much faster than screenshot+fetchImage)
        const detection = await faceapi
            .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
            .withFaceLandmarks()
            .withFaceDescriptor()

        if (!detection) {
            // Only update status if we are not in a failure sequence
            if (unknownAttemptsRef.current === 0) {
                 setVerificationStatus('Поиск лица...')
            }
            return
        }

        // Quality check - normalized for downscaled canvas (relative size)
        const box = detection.detection.box
        const relativeWidth = box.width / canvas.width
        if (relativeWidth < 0.18) { // ~86px on 480px canvas, equivalent to ~100px on original
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
                const last = lastScannedRef.current[scanKey]
                if (last && now - last < 60000) {
                   setVerificationStatus(`Подождите...`)
                   isProcessingRef.current = false
                   return
                }
                
                setVerificationStatus(`Распознан: ${match.label}`)
                
                // Fetch full employee data
                try {
                    const emp = isKioskApiMode
                      ? await (async () => {
                          // Create AbortController for employee fetch
                          const abortController = new AbortController()
                          const res = await fetch(`/api/kiosk/employees/${encodeURIComponent(match.label)}`, {
                            headers: { Authorization: `Bearer ${kioskToken}` },
                            signal: abortController.signal,
                          })
                          if (!res.ok) throw new Error(`Failed to fetch kiosk employee (${res.status})`)
                          return await res.json()
                        })()
                      : await getEmployee(match.label)

                    if (emp && !('error' in emp)) {
                      setEmployee(emp)
                      await processAttendance(emp)
                    } else {
                         throw new Error("Employee not found")
                    }
                } catch (err) {
                    // Ignore abort errors
                    if (err instanceof Error && err.name === 'AbortError') {
                      isProcessingRef.current = false
                      return
                    }
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
    } finally {
        // Always clear frame guard
        frameInFlightRef.current = false
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

  // Adaptive loop trigger
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    let isActive = true
    const TARGET_CADENCE_MS = 300 // Target: 300ms between frames (middle of 250-350ms range)

    const scheduleNextFrame = () => {
      if (!isActive) return
      
      const startTime = performance.now()
      
      // Process frame asynchronously
      processFrame().finally(() => {
        if (!isActive) return
        
        const elapsedMs = performance.now() - startTime
        // Schedule next frame: max(0, targetMs - elapsedMs)
        // If processing took longer than target, schedule immediately (0ms)
        const delayMs = Math.max(0, TARGET_CADENCE_MS - elapsedMs)
        
        timeoutId = setTimeout(scheduleNextFrame, delayMs)
      })
    }

    if (modelsLoaded && step === 'scanning' && scanMode && !resultOverlay) {
      // Start the adaptive loop
      scheduleNextFrame()
    }

    return () => {
      isActive = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [modelsLoaded, step, faceMatcher, scanMode, resultOverlay, selectedStoreId])


  async function processAttendance(empData: any) {
    const targetEmployee = empData
    if (!targetEmployee || !scanMode) return
    
    try {
      const result = isKioskApiMode
        ? await (async () => {
            // Create AbortController for attendance fetch
            const abortController = new AbortController()
            const res = await fetch('/api/kiosk/attendance', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${kioskToken}`,
              },
              body: JSON.stringify({ employeeId: targetEmployee.id, type: scanMode }),
              signal: abortController.signal,
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
              return { success: false, error: data?.error || 'Ошибка', status: data?.status }
            }
            return data
          })()
        : await registerAttendance(targetEmployee.id, scanMode, selectedStoreId || undefined)
      
       // Helper for Uzbek messages
       const greetingMessages = [
           "Ishingizga omad!",
           "Xush kelibsiz!",
           "Kuningiz xayrli o'tsin!",
           "Yaxshi ishlang!",
           "Olg'a!"
       ]
       
       const farewellMessages = [
           "Yaxshi dam oling!",
           "Xayr, sog' bo'ling!",
           "Charchamang!",
           "Ertagacha!",
           "Rahmat, yaxshi boring!"
       ]

       // Random message picker
       const getRandomMessage = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

       // Update cooldown map on success
       if (result.success) {
            const scanKey = `${targetEmployee.id}-${scanMode}`
            lastScannedRef.current[scanKey] = Date.now()

            const modeLabel = scanMode === "in" ? "Вход" : "Выход"
            
            const successMsg = scanMode === 'in' 
                ? `${modeLabel}: ${getRandomMessage(greetingMessages)}`
                : `${modeLabel}: ${getRandomMessage(farewellMessages)}`

            setResultOverlay({ 
                type: 'success', 
                message: successMsg, 
                employee: targetEmployee 
            })
            fetchLogs()
      } else {
           const modeLabel = scanMode === "in" ? "Вход" : "Выход"
           // Handle specific statuses
           if (result.status === 'ALREADY_CHECKED_IN' || result.status === 'ALREADY_CHECKED_OUT') {
               setResultOverlay({ 
                   type: 'already', 
                   message: `${modeLabel}: ${result.error || 'Уже отмечено'}`, 
                   employee: targetEmployee 
               })
           } else {
               setResultOverlay({ 
                   type: 'error', 
                   message: `${modeLabel}: ${result.error || 'Ошибка'}` 
               })
           }
      }

      // Automatically close after delay
      setTimeout(() => {
          handleScanComplete()
      }, 2500)
      
    } catch (error) {
       // Ignore abort errors
       if (error instanceof Error && error.name === 'AbortError') {
         return
       }
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

  // Calculate Top 3 Early Birds
  const earlyBirds = useMemo(() => {
    // Filter logs that have a check-in time, deduplicate by employee, and sort by check-in time (ascending)
    const checkedInEmployees = new Map();
    
    recentLogs.forEach(log => {
      if (log.checkIn && !checkedInEmployees.has(log.employee.id)) {
         checkedInEmployees.set(log.employee.id, log);
      }
    });

    return Array.from(checkedInEmployees.values())
      .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
      .slice(0, 3);
  }, [recentLogs]);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)] min-h-0">
      {/* Mobile: Full-page Activity List */}
      {activeTab === 'list' && (
        <div className="lg:hidden flex flex-col h-full min-h-0">
          <TodayActivityList 
            storeId={selectedStoreId || undefined} 
            kioskAccessToken={isKioskApiMode ? (kioskToken || undefined) : undefined}
            onBack={() => setActiveTab('scanner')} 
          />
        </div>
      )}

      {/* Mobile View Toggles - only show when on scanner */}
      <div className={`lg:hidden flex mb-4 bg-muted/50 p-1 rounded-xl ${activeTab === 'list' ? 'hidden' : ''}`}>
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

      <div className={`flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0 ${activeTab === 'list' ? 'hidden lg:flex' : ''}`}>
        {/* Left Panel: Scanner */}
        <Card className={`lg:col-span-7 flex flex-col overflow-hidden neo-card neo-float h-full lg:max-h-[calc(100vh-10rem)] flex`}>
          <CardHeader className="pb-4 border-b bg-card/50 backdrop-blur-sm z-10 flex flex-row items-center justify-between h-auto min-h-[5rem] px-6">
              <div className="space-y-1">
                  {preselectedStoreId ? (
                      <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                          <CardTitle className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                              <Store className="h-8 w-8" />
                              {stores.find(s => s.id === selectedStoreId)?.name || fetchedStoreName || (stores.length === 0 ? 'Магазин' : 'Магазин не найден')}
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
                           <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in zoom-in duration-300">
                               <Card className={`w-full max-w-[92vw] sm:max-w-sm border-0 shadow-2xl ${
                                   resultOverlay?.type === 'success' ? 'bg-green-500/10 border-green-500/50' :
                                   resultOverlay?.type === 'already' ? 'bg-orange-500/10 border-orange-500/50' : 
                                   'bg-red-500/10 border-red-500/50'
                               } border-2`}>
                                   <CardContent className="flex flex-col items-center justify-center p-5 sm:p-8 text-center space-y-4 max-h-[80vh] overflow-y-auto">
                                       
                                       {resultOverlay?.employee && (
                                           <Avatar className="h-16 w-16 sm:h-24 sm:w-24 border-4 border-background shadow-xl mb-2">
                                               <AvatarImage src={resultOverlay?.employee.imageUrl} />
                                               <AvatarFallback className="text-xl sm:text-2xl">{resultOverlay?.employee.firstName[0]}</AvatarFallback>
                                           </Avatar>
                                       )}

                                       <div className={`p-3 sm:p-4 rounded-full ${
                                           resultOverlay?.type === 'success' ? 'bg-green-500 text-white' :
                                           resultOverlay?.type === 'already' ? 'bg-orange-500 text-white' :
                                           'bg-red-500 text-white'
                                       }`}>
                                           {resultOverlay?.type === 'success' && <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8" />}
                                           {resultOverlay?.type === 'already' && <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8" />}
                                           {resultOverlay?.type === 'error' && <XCircle className="h-7 w-7 sm:h-8 sm:w-8" />}
                                       </div>

                                       <div className="space-y-1 min-w-0">
                                           <h2 className="text-xl sm:text-2xl font-bold text-white break-words leading-snug">
                                               {resultOverlay?.employee 
                                                   ? `${resultOverlay?.employee.firstName} ${resultOverlay?.employee.lastName}`
                                                   : (resultOverlay?.type === 'error' ? 'Ошибка' : resultOverlay?.type)
                                               }
                                           </h2>
                                           <p className="text-base sm:text-lg text-white/90 font-medium break-words leading-snug">
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
                              <div className={`px-3 py-2 sm:px-6 rounded-2xl sm:rounded-full backdrop-blur-md border shadow-xl transition-all duration-300 max-w-[92vw] sm:max-w-[80%] ${
                                  verificationStatus.includes('Распознан') 
                                      ? 'bg-green-500/20 border-green-500/50 text-green-100' 
                                      : verificationStatus.includes('Не распознан')
                                      ? 'bg-red-500/20 border-red-500/50 text-red-100'
                                      : 'bg-black/60 border-white/10 text-white'
                              }`}>
                                  <div className="font-medium flex items-center justify-center gap-2 min-w-0 text-center text-sm sm:text-base leading-snug">
                                      {verificationStatus.includes('Распознан') && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                        {verificationStatus}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Recent Activity */}
        <Card className={`lg:col-span-5 flex flex-col h-full max-h-[calc(100vh-8rem)] overflow-hidden neo-card neo-float lg:flex ${activeTab === 'list' ? 'flex' : 'hidden'}`}>
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Активность за сегодня
            </CardTitle>
            <CardDescription>
              Последние действия сотрудников
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
            
            {/* Fixed Early Birds Section */}
            {earlyBirds.length > 0 && (
                <div className="p-6 pb-4 border-b shrink-0 bg-card z-10">
                    <div className="bg-gradient-to-br from-yellow-500/10 to-transparent p-4 rounded-xl border border-yellow-500/20">
                        <div className="flex items-center gap-2 mb-4">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            <h3 className="font-semibold text-yellow-600 dark:text-yellow-400">Ранние чемпионы</h3>
                        </div>
                        <div className="flex justify-around items-end gap-2">
                             {/* 2nd Place */}
                             {earlyBirds[1] && (
                                <div className="flex flex-col items-center gap-1 group">
                                     <div className="relative">
                                        <Avatar className="h-12 w-12 border-2 border-slate-300 shadow-md transform sm:group-hover:-translate-y-1 transition-transform">
                                            <AvatarImage src={earlyBirds[1].employee.imageUrl} />
                                            <AvatarFallback>{earlyBirds[1].employee.firstName[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-2 -right-1 bg-slate-300 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white">
                                            #2
                                        </div>
                                     </div>
                                     <div className="text-center">
                                         <p className="text-xs font-semibold truncate max-w-[80px]">{earlyBirds[1].employee.firstName}</p>
                                         <p className="text-[10px] text-muted-foreground">{new Date(earlyBirds[1].checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                     </div>
                                </div>
                             )}

                             {/* 1st Place */}
                             {earlyBirds[0] && (
                                <div className="flex flex-col items-center gap-1 -mt-4 group relative z-10">
                                     <div className="relative">
                                         <div className="absolute -top-6 left-0 right-0 flex justify-center text-yellow-500 animate-bounce">
                                            <Trophy className="h-6 w-6 fill-yellow-500" />
                                         </div>
                                        <Avatar className="h-16 w-16 border-4 border-yellow-400 shadow-xl transform sm:group-hover:-translate-y-1 transition-transform bg-background">
                                            <AvatarImage src={earlyBirds[0].employee.imageUrl} />
                                            <AvatarFallback className="text-xl bg-yellow-100 text-yellow-700">{earlyBirds[0].employee.firstName[0]}</AvatarFallback>
                                        </Avatar>
                                     </div>
                                     <div className="text-center mt-1">
                                         <p className="text-sm font-bold truncate max-w-[100px] text-yellow-600 dark:text-yellow-400">{earlyBirds[0].employee.firstName}</p>
                                         <Badge variant="outline" className="text-[10px] bg-yellow-500/10 border-yellow-500/20 text-yellow-600">
                                            {new Date(earlyBirds[0].checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                         </Badge>
                                     </div>
                                </div>
                             )}

                             {/* 3rd Place */}
                             {earlyBirds[2] && (
                                <div className="flex flex-col items-center gap-1 group">
                                     <div className="relative">
                                        <Avatar className="h-12 w-12 border-2 border-orange-300 shadow-md transform sm:group-hover:-translate-y-1 transition-transform">
                                            <AvatarImage src={earlyBirds[2].employee.imageUrl} />
                                            <AvatarFallback>{earlyBirds[2].employee.firstName[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-2 -left-1 bg-orange-300 text-orange-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white">
                                            #3
                                        </div>
                                     </div>
                                     <div className="text-center">
                                         <p className="text-xs font-semibold truncate max-w-[80px]">{earlyBirds[2].employee.firstName}</p>
                                         <p className="text-[10px] text-muted-foreground">{new Date(earlyBirds[2].checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                     </div>
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            )}

            {/* Scrollable Activity List */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/10">
                 <div className="px-6 py-3 border-b bg-muted/20 flex items-center justify-between shrink-0 backdrop-blur-sm z-10">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Все записи
                      </h4>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-background/50">{recentLogs.length}</Badge>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="p-4 space-y-3">
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
                 </div>
            </div>
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
