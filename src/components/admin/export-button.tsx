'use client'

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { exportData } from "@/app/actions/export"
import { toast } from "sonner"

export function ExportButton() {
  const handleExport = async () => {
    try {
      const csvData = await exportData("csv")
      const blob = new Blob([csvData], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `kpi-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Экспорт выполнен успешно")
    } catch (error) {
      toast.error("Ошибка экспорта данных")
      console.error(error)
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} className="gap-2">
      <Download className="h-4 w-4" />
      Экспорт CSV
    </Button>
  )
}
