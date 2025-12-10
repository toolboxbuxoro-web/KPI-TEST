'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogOut, LayoutDashboard, LogIn } from "lucide-react"
import { signOut } from "next-auth/react"
import { ThemeToggle } from "@/components/theme-toggle"

interface HomeHeaderProps {
  user?: {
    name?: string | null
    image?: string | null
  }
}

export function HomeHeader({ user }: HomeHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 px-6 md:px-10 bg-background/30 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold neo-shadow">
                T
            </div>
            <span>Toolbox <span className="text-primary">Control</span></span>
        </div>
        <div className="flex items-center gap-4">
            <ThemeToggle />
            {user ? (
                <>
                    <span className="text-sm font-medium hidden sm:inline-block opacity-80">
                        {user.name}
                    </span>
                    <Link href="/admin">
                        <Button variant="default" size="sm" className="gap-2 neo-float neo-gradient text-white border-0">
                            <LayoutDashboard className="h-4 w-4" />
                            Кабинет
                        </Button>
                    </Link>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Выйти"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </>
            ) : (
                <Link href="/login">
                    <Button className="gap-2 neo-float neo-gradient text-white border-0 shadow-lg shadow-primary/20">
                         <LogIn className="h-4 w-4" />
                         Войти
                    </Button>
                </Link>
            )}
        </div>
    </header>
  )
}
