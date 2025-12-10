import prisma from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  })

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">Аудит действий</h2>

      <Card>
        <CardHeader>
          <CardTitle>Последние действия</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Время</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead>Сущность</TableHead>
                <TableHead>Детали</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {log.createdAt.toLocaleString("ru-RU")}
                  </TableCell>
                  <TableCell>{log.userId}</TableCell>
                  <TableCell className="uppercase font-bold text-xs">{log.action}</TableCell>
                  <TableCell>{log.entity}</TableCell>
                  <TableCell className="font-mono text-xs max-w-xs truncate">
                    {JSON.stringify(log.newValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
