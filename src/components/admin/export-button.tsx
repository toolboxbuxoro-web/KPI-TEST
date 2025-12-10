'use client'

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

import { toast } from "sonner"

export function ExportButton() {
  const handleExport = () => {
    window.location.href = "/api/export"
  }

  return (
    <Button variant="outline" onClick={handleExport} className="gap-2">
      <Download className="h-4 w-4" />
      Экспорт CSV
    </Button>
  )
}
