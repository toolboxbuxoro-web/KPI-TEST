import prisma from "@/lib/db"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { AttendanceHistory } from "@/components/admin/attendance-history"
import { Separator } from "@/components/ui/separator"
import { Building2, CalendarDays, Clock, Mail, Phone, User, ScanFace } from "lucide-react"
import { FaceDescriptorGenerator } from "@/components/admin/face-descriptor-generator"

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      attendance: {
        orderBy: { checkIn: 'desc' },
        take: 1
      }
    }
  })

  if (!employee) {
    notFound()
  }

  const lastActivity = employee.attendance[0]
  const isOnline = lastActivity && !lastActivity.checkOut

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-background border shadow-sm">
        <div className="absolute top-0 right-0 p-8 opacity-10">
            <User className="w-64 h-64 text-primary" />
        </div>
        
        <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center gap-8">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl ring-4 ring-primary/10">
                <AvatarImage src={employee.imageUrl || undefined} className="object-cover" />
                <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">
                {employee.firstName?.[0]}{employee.lastName?.[0]}
                </AvatarFallback>
            </Avatar>
            
            <div className="space-y-4 flex-1">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-4xl font-bold tracking-tight">{employee.firstName} {employee.lastName}</h1>
                        <Badge variant={isOnline ? "default" : "secondary"} className="text-base px-3 py-1">
                            {isOnline ? "🟢 На работе" : "⚪️ Не на работе"}
                        </Badge>
                    </div>
                    <p className="text-xl text-muted-foreground font-medium flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {employee.position}
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-full border shadow-sm">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        <span>В штате с {new Date(employee.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-full border shadow-sm">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>Последняя активность: {lastActivity ? new Date(lastActivity.updatedAt).toLocaleString() : "Нет данных"}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Stats & Info */}
        <div className="space-y-6">
            <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-border/50">
                <CardHeader className="bg-muted/30 pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <ScanFace className="h-5 w-5 text-primary" />
                        Биометрия
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <FaceDescriptorGenerator 
                        employeeId={employee.id}
                        imageUrl={employee.imageUrl}
                        hasDescriptor={!!employee.faceDescriptor}
                        hasConsent={!!employee.consentSignedAt}
                    />
                </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-border/50">
                <CardHeader className="bg-muted/30 pb-4">
                    <CardTitle>Информация</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <User className="h-4 w-4" /> ID сотрудника
                            </span>
                            <span className="font-mono text-sm">{employee.id.slice(-8)}</span>
                        </div>
                        {/* Add more fields here if available in schema */}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg ring-1 ring-border/50 h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        История посещений
                    </CardTitle>
                    <CardDescription>
                        Детальный журнал учета рабочего времени
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AttendanceHistory employeeId={employee.id} />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
