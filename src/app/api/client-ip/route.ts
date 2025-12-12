import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

/**
 * GET /api/client-ip
 * Returns the client's IP address
 * Tries to get public IP first, falls back to local detection
 */
export async function GET(request: NextRequest) {
  const headersList = await headers()
  
  // Try to get public IP from external services (for WiFi network identification)
  let publicIP: string | null = null
  
  try {
    // Try ipify first (most reliable)
    const response = await fetch('https://api.ipify.org?format=json', { 
      signal: AbortSignal.timeout(3000) // 3 second timeout
    })
    if (response.ok) {
      const data = await response.json()
      publicIP = data.ip
    }
  } catch {
    // Try backup service
    try {
      const response = await fetch('https://api.ip.sb/ip', { 
        signal: AbortSignal.timeout(3000)
      })
      if (response.ok) {
        publicIP = (await response.text()).trim()
      }
    } catch {
      // Ignore - will use local detection
    }
  }

  // Local IP detection (fallback)
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIP = headersList.get('x-real-ip')
  const cfConnectingIP = headersList.get('cf-connecting-ip')
  const requestIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
  
  let localIP: string | null = null
  
  if (forwardedFor) {
    localIP = forwardedFor.split(',')[0].trim()
  } else if (realIP) {
    localIP = realIP.trim()
  } else if (cfConnectingIP) {
    localIP = cfConnectingIP.trim()
  } else if (requestIP) {
    localIP = requestIP.split(',')[0].trim()
  }
  
  // Normalize IPv6-mapped IPv4
  if (localIP && localIP.startsWith('::ffff:')) {
    localIP = localIP.substring(7)
  }
  
  // Use public IP if available, otherwise local
  const finalIP = publicIP || localIP
  
  // Log for debugging
  console.log('[Client IP] Detection:', {
    publicIP,
    localIP,
    finalIP
  })
  
  return NextResponse.json({ 
    ip: finalIP,
    publicIP,
    localIP,
    source: publicIP ? 'public' : 'local'
  })
}

