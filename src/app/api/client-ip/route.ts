import { NextResponse } from 'next/server'
import { getClientIP } from '@/lib/get-client-ip'

/**
 * GET /api/client-ip
 * Returns the client's IP address
 */
export async function GET() {
  const ip = await getClientIP()
  
  return NextResponse.json({ 
    ip: ip || null 
  })
}
