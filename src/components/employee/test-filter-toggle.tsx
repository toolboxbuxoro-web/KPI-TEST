'use client'

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface TestFilterToggleProps {
  employeeId: string
}

export function TestFilterToggle({ employeeId }: TestFilterToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const showAll = searchParams.get('showAll') === 'true'

  const handleToggle = () => {
    const newShowAll = !showAll
    if (newShowAll) {
      router.push(`${pathname}?showAll=true`)
    } else {
      router.push(pathname)
    }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <Switch 
        id="show-all" 
        checked={showAll}
        onCheckedChange={handleToggle}
      />
      <Label 
        htmlFor="show-all" 
        className="text-sm font-medium cursor-pointer select-none"
      >
        Показать все тесты
      </Label>
    </div>
  )
}

