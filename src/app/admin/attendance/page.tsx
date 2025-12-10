import { AttendanceScanner } from "@/components/admin/attendance-scanner"

export default function AttendancePage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Учет рабочего времени</h1>
      <AttendanceScanner />
    </div>
  )
}
