import prisma from "@/lib/db"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AttendanceHistory } from "@/components/admin/attendance-history"
import { Separator } from "@/components/ui/separator"
import { 
  Building2, 
  CalendarDays, 
  Clock, 
  Mail, 
  Phone, 
  User, 
  ScanFace,
  Cake,
  MapPin,
  Shield,
  Briefcase,
  IdCard,
  History,
  Info
} from "lucide-react"
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
      },
      store: true
    }
  })

  if (!employee) {
    notFound()
  }

  const lastActivity = employee.attendance[0]
  const isOnline = lastActivity && !lastActivity.checkOut

  // Format birth date
  const formatBirthDate = (date: Date | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  // Calculate age
  const calculateAge = (birthDate: Date | null) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Role display map
  const roleDisplayMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    ADMIN: { label: "Администратор", variant: "destructive" },
    MANAGER: { label: "Менеджер", variant: "default" },
    EMPLOYEE: { label: "Сотрудник", variant: "secondary" },
  }

  const roleInfo = roleDisplayMap[employee.role || 'EMPLOYEE'] || roleDisplayMap.EMPLOYEE

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-7xl mx-auto px-2 sm:px-4 lg:px-0">
      {/* Header Section - Mobile First */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border shadow-sm">
        {/* Background decoration - hidden on mobile */}
        <div className="hidden sm:block absolute top-0 right-0 p-8 opacity-10">
          <User className="w-48 h-48 lg:w-64 lg:h-64 text-primary" />
        </div>
        
        <div className="relative p-4 sm:p-6 md:p-8 lg:p-12">
          {/* Avatar and Name Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 lg:gap-8">
            {/* Avatar */}
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 border-4 border-background shadow-xl ring-4 ring-primary/10 flex-shrink-0">
              <AvatarImage src={employee.imageUrl || undefined} className="object-cover" />
              <AvatarFallback className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-primary/10 text-primary">
                {employee.firstName?.[0]}{employee.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            
            {/* Info Section */}
            <div className="flex-1 text-center sm:text-left space-y-3 sm:space-y-4 w-full">
              {/* Name and Status */}
              <div>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                    {employee.firstName} {employee.lastName}
                  </h1>
                  <Badge 
                    variant={isOnline ? "default" : "secondary"} 
                    className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 whitespace-nowrap"
                  >
                    {isOnline ? "🟢 На работе" : "⚪️ Не на работе"}
                  </Badge>
                </div>
                
                {/* Position and Role */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2">
                  <p className="text-base sm:text-lg lg:text-xl text-muted-foreground font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
                    {employee.position}
                  </p>
                  {employee.role && (
                    <Badge variant={roleInfo.variant} className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      {roleInfo.label}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Quick Info Pills */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-background/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border shadow-sm">
                  <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  <span className="whitespace-nowrap">С {new Date(employee.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
                {employee.store && (
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-background/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border shadow-sm">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    <span className="whitespace-nowrap">{employee.store.name}</span>
                  </div>
                )}
                {lastActivity && (
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-background/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border shadow-sm">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    <span className="whitespace-nowrap">{new Date(lastActivity.updatedAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Grid Layout / Mobile: Tabs */}
      {/* Mobile View: Tabs */}
      <div className="block lg:hidden">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="info" className="text-xs sm:text-sm">
              <Info className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Информация</span>
              <span className="sm:hidden">Инфо</span>
            </TabsTrigger>
            <TabsTrigger value="biometrics" className="text-xs sm:text-sm">
              <ScanFace className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Биометрия</span>
              <span className="sm:hidden">Био</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              <History className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">История</span>
              <span className="sm:hidden">Ист.</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="mt-0">
            <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-border/50">
              <CardHeader className="bg-muted/30 pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">Личная информация</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <EmployeeInfoList employee={employee} formatBirthDate={formatBirthDate} calculateAge={calculateAge} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="biometrics" className="mt-0">
            <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-border/50">
              <CardHeader className="bg-muted/30 pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ScanFace className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Биометрия
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <FaceDescriptorGenerator 
                  employeeId={employee.id}
                  imageUrl={employee.imageUrl}
                  hasDescriptor={!!employee.faceDescriptor}
                  hasConsent={!!employee.consentSignedAt}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="mt-0">
            <Card className="border-0 shadow-lg ring-1 ring-border/50">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  История посещений
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Журнал учета рабочего времени
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <AttendanceHistory employeeId={employee.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop View: Grid */}
      <div className="hidden lg:grid gap-6 lg:gap-8 lg:grid-cols-3">
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
              <CardTitle>Личная информация</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <EmployeeInfoList employee={employee} formatBirthDate={formatBirthDate} calculateAge={calculateAge} />
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

// Extracted component for employee info list
function EmployeeInfoList({ 
  employee, 
  formatBirthDate, 
  calculateAge 
}: { 
  employee: any
  formatBirthDate: (date: Date | null) => string | null
  calculateAge: (date: Date | null) => number | null
}) {
  const infoItems = [
    {
      icon: IdCard,
      label: "ID сотрудника",
      value: employee.id.slice(-8),
      mono: true
    },
    employee.middleName && {
      icon: User,
      label: "Отчество",
      value: employee.middleName
    },
    employee.phone && {
      icon: Phone,
      label: "Телефон",
      value: employee.phone,
      link: `tel:${employee.phone}`
    },
    employee.email && {
      icon: Mail,
      label: "Email",
      value: employee.email,
      link: `mailto:${employee.email}`
    },
    employee.birthDate && {
      icon: Cake,
      label: "Дата рождения",
      value: `${formatBirthDate(employee.birthDate)} (${calculateAge(employee.birthDate)} лет)`
    },
    employee.store && {
      icon: Building2,
      label: "Магазин",
      value: employee.store.name
    },
    {
      icon: CalendarDays,
      label: "Дата создания",
      value: new Date(employee.createdAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }
  ].filter(Boolean) as Array<{
    icon: any
    label: string
    value: string
    mono?: boolean
    link?: string
  }>

  return (
    <div className="divide-y">
      {infoItems.map((item, index) => (
        <div 
          key={index} 
          className="p-3 sm:p-4 flex items-center justify-between hover:bg-muted/50 transition-colors gap-2"
        >
          <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">{item.label}</span>
            <span className="xs:hidden">{item.label.slice(0, 10)}</span>
          </span>
          {item.link ? (
            <a 
              href={item.link} 
              className={`text-xs sm:text-sm text-primary hover:underline truncate max-w-[50%] sm:max-w-none ${item.mono ? 'font-mono' : ''}`}
            >
              {item.value}
            </a>
          ) : (
            <span className={`text-xs sm:text-sm text-right truncate max-w-[50%] sm:max-w-none ${item.mono ? 'font-mono' : ''}`}>
              {item.value}
            </span>
          )}
        </div>
      ))}
      
      {/* Status indicator */}
      <div className="p-3 sm:p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
        <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2">
          <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Статус
        </span>
        <Badge variant={employee.isActive !== false ? "default" : "secondary"} className="text-xs">
          {employee.isActive !== false ? "Активен" : "Неактивен"}
        </Badge>
      </div>
    </div>
  )
}
