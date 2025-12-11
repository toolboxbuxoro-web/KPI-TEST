import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScanFace, ClipboardList, ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

import { AttendanceScanner } from "@/components/admin/attendance-scanner"
import { AttendanceTable } from "@/components/admin/attendance-table"
import { AttendanceExportDialog } from "@/components/admin/attendance-export-dialog"
import { getAttendanceRecords, getStoresForFilter, getAttendanceStats } from "@/app/actions/attendance-admin"
import { Button } from "@/components/ui/button"

interface PageProps {
  searchParams: Promise<{
    storeId?: string
    from?: string
    to?: string
  }>
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const params = await searchParams
  
  // Default to today if no date specified
  const today = format(new Date(), 'yyyy-MM-dd')
  const fromDate = params.from || today
  const toDate = params.to || today
  const storeId = params.storeId

  // Fetch data on server (including stats)
  const [records, stores, stats] = await Promise.all([
    getAttendanceRecords(new Date(fromDate), new Date(toDate), storeId),
    getStoresForFilter(),
    getAttendanceStats(new Date(fromDate), new Date(toDate), storeId)
  ])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Учет рабочего времени</h1>
        </div>
        <AttendanceExportDialog />
      </div>
      
      <Tabs defaultValue="scanner" className="space-y-6">
        <TabsList className="neo-card p-1">
          <TabsTrigger value="scanner" className="gap-2 data-[state=active]:neo-gradient data-[state=active]:text-white">
            <ScanFace className="h-4 w-4" />
            Сканер
          </TabsTrigger>
          <TabsTrigger value="records" className="gap-2 data-[state=active]:neo-gradient data-[state=active]:text-white">
            <ClipboardList className="h-4 w-4" />
            Записи
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="scanner" className="mt-0">
          <AttendanceScanner />
        </TabsContent>
        
        <TabsContent value="records" className="mt-0">
          <AttendanceTable 
            records={records}
            stores={stores}
            fromDate={fromDate}
            toDate={toDate}
            storeId={storeId}
            stats={stats}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
