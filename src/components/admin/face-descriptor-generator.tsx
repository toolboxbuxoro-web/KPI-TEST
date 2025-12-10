'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ScanFace, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import * as faceapi from 'face-api.js'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { saveFaceDescriptor, signBiometricConsent } from '@/app/actions/face-recognition'

interface FaceDescriptorGeneratorProps {
  employeeId: string
  imageUrl: string | null | undefined
  hasDescriptor?: boolean
  hasConsent?: boolean
  onDescriptorGenerated?: () => void
}

export function FaceDescriptorGenerator({
  employeeId,
  imageUrl,
  hasDescriptor = false,
  hasConsent = false,
  onDescriptorGenerated
}: FaceDescriptorGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [modelsLoaded, setModelsLoaded] = useState(false)

  const loadModels = async () => {
    if (modelsLoaded) return true
    
    try {
      const MODEL_URL = '/models'
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ])
      setModelsLoaded(true)
      return true
    } catch (error) {
      console.error('Failed to load face-api models', error)
      return false
    }
  }

  const generateDescriptor = async () => {
    if (!imageUrl) {
      toast.error('Нет фотографии сотрудника')
      return
    }

    setIsGenerating(true)
    setStatus('loading')

    try {
      // First, sign consent if not already signed
      if (!hasConsent) {
        await signBiometricConsent(employeeId)
      }

      // Load models
      const loaded = await loadModels()
      if (!loaded) {
        throw new Error('Failed to load face recognition models')
      }

      // Fetch and process image
      const img = await faceapi.fetchImage(imageUrl)
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        setStatus('error')
        toast.error('Лицо не обнаружено на фотографии')
        return
      }

      // Save descriptor to database
      const descriptorArray = Array.from(detection.descriptor)
      const result = await saveFaceDescriptor(employeeId, descriptorArray)

      if (result.error) {
        setStatus('error')
        toast.error(result.error)
      } else {
        setStatus('success')
        toast.success('Биометрия успешно сохранена!')
        onDescriptorGenerated?.()
      }
    } catch (error) {
      console.error('Error generating descriptor:', error)
      setStatus('error')
      toast.error('Ошибка при генерации биометрии')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!imageUrl) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        Загрузите фото для биометрии
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {hasDescriptor ? (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Биометрия активна
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Биометрия не настроена
          </Badge>
        )}
      </div>

      <Button
        type="button"
        variant={hasDescriptor ? "outline" : "default"}
        size="sm"
        onClick={generateDescriptor}
        disabled={isGenerating}
        className="gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Генерация...
          </>
        ) : hasDescriptor ? (
          <>
            <RefreshCw className="h-4 w-4" />
            Обновить биометрию
          </>
        ) : (
          <>
            <ScanFace className="h-4 w-4" />
            Создать биометрию
          </>
        )}
      </Button>

      {!hasConsent && (
        <p className="text-xs text-muted-foreground">
          ⚠️ При генерации биометрии будет зарегистрировано согласие сотрудника
        </p>
      )}
    </div>
  )
}
