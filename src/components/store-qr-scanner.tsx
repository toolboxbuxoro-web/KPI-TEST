'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Scan, QrCode, AlertTriangle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface StoreQRScannerProps {
  onScanSuccess: (storeId: string) => void
}

export function StoreQRScanner({ onScanSuccess }: StoreQRScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(true)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    let scanner: Html5Qrcode | null = null

    if (isScanning) {
        setError(null)
        // Initialize scanner with a slight delay to ensure DOM is ready
        const timer = setTimeout(() => {
            try {
                scanner = new Html5Qrcode("reader", {
                    verbose: false,
                    formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
                })
                scannerRef.current = scanner

                scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        console.log("Scanned:", decodedText)
                        onScanSuccess(decodedText)
                        setIsScanning(false)
                    },
                    (errorMessage) => {
                        // Ignore parse errors
                    }
                ).catch(err => {
                    console.error("Failed to start scanner", err)
                    let msg = "Не удалось запустить камеру."
                    if (err?.name === 'NotAllowedError' || err?.toString().includes('NotAllowedError')) {
                        msg = "Доступ к камере запрещен. Разрешите доступ в настройках браузера."
                    } else if (err?.name === 'NotFoundError') {
                        msg = "Камера не найдена."
                    }
                    setError(msg)
                    setIsScanning(false)
                })

            } catch (err) {
                console.error("Failed to init scanner", err)
                setError("Ошибка инициализации сканера.")
                setIsScanning(false)
            }
        }, 100)

        return () => clearTimeout(timer)
    }

    // Cleanup function
    return () => {
        if (scanner) {
            if (scanner.isScanning) {
                scanner.stop().then(() => {
                    scanner?.clear()
                }).catch(console.error)
            } else {
                scanner.clear()
            }
        }
    }
  }, [isScanning, onScanSuccess])

  const startScanning = () => setIsScanning(true)
  const stopScanning = () => setIsScanning(false)

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="neo-card neo-float">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <QrCode className="h-6 w-6 text-primary" />
            Сканер Магазина
          </CardTitle>
          <CardDescription>
            Отсканируйте QR-код магазина для инициализации
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="w-full aspect-square bg-black rounded-xl overflow-hidden relative">
             {/* Critical Fix: The reader div is now empty and isolated from React conditional rendering of the placeholder */}
             <div id="reader" className="w-full h-full"></div>
             
             {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/20 pointer-events-none">
                    <Scan className="h-16 w-16 text-muted-foreground/50" />
                </div>
             )}
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Ошибка</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {!isScanning ? (
            <Button onClick={startScanning} className="w-full neo-gradient" size="lg">
              <Scan className="mr-2 h-5 w-5" />
              Начать сканирование
            </Button>
          ) : (
             <Button onClick={stopScanning} variant="destructive" className="w-full" size="lg">
              Остановить
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
