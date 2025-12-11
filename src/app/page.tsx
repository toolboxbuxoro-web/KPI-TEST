import { auth } from "@/auth"
import { HomeHeader } from "@/components/home-header"
import { AttendanceFlow } from "@/components/attendance-flow"
import { SessionProvider } from "next-auth/react"

export default async function Home() {
  const session = await auth()

  return (
    <div className="min-h-screen bg-background neo-pattern flex flex-col pt-20">
       {/* Use SessionProvider here for client components if needed, though RootLayout usually handles it. 
           But passing session to provider inside might be better if RootProviders doesn't wrap session.
           Actually Providers usually wraps SessionProvider. 
           Assuming Providers in layout does it.
       */}
      <HomeHeader user={session?.user} />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-20 pointer-events-none" />
        
        <div className="w-full flex-1 relative z-10 flex flex-col items-center justify-center px-4 py-4">
           <AttendanceFlow />
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground bg-background/50 backdrop-blur-sm border-t border-white/5">
        © {new Date().getFullYear()} Toolbox Control System. All rights reserved.
      </footer>
    </div>
  )
}


