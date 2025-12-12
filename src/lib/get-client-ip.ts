import { headers } from 'next/headers'

/**
 * Get the client IP address from request headers
 * Works with proxies (x-forwarded-for) and direct connections
 */
export async function getClientIP(): Promise<string | null> {
  const headersList = await headers()
  
  // Check x-forwarded-for first (common for proxied requests)
  const forwardedFor = headersList.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for may contain multiple IPs: client, proxy1, proxy2, ...
    // The first one is the original client IP
    const firstIP = forwardedFor.split(',')[0].trim()
    return firstIP
  }
  
  // Check x-real-ip (Nginx)
  const realIP = headersList.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }
  
  // Fallback to cf-connecting-ip (Cloudflare)
  const cfConnectingIP = headersList.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP.trim()
  }
  
  return null
}

/**
 * Validate IP address format (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  // IPv4 pattern
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  // IPv6 pattern (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}:){1,7}:$|^:(:([0-9a-fA-F]{1,4})){1,7}$/
  
  if (ipv4Regex.test(ip)) {
    // Validate IPv4 octets are in range 0-255
    const parts = ip.split('.')
    return parts.every(part => {
      const num = parseInt(part, 10)
      return num >= 0 && num <= 255
    })
  }
  
  return ipv6Regex.test(ip)
}

/**
 * Normalize IP address for comparison
 * Handles cases like ::ffff:192.168.1.1 (IPv4-mapped IPv6)
 */
export function normalizeIP(ip: string): string {
  // Remove IPv4-mapped IPv6 prefix
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7)
  }
  return ip.toLowerCase().trim()
}

/**
 * Check if client IP is in the allowed list
 */
export function isIPAllowed(clientIP: string, allowedIPs: string[]): boolean {
  if (!allowedIPs || allowedIPs.length === 0) {
    // No restriction - allow all IPs
    return true
  }
  
  const normalizedClientIP = normalizeIP(clientIP)
  
  return allowedIPs.some(allowedIP => {
    const normalizedAllowedIP = normalizeIP(allowedIP)
    return normalizedClientIP === normalizedAllowedIP
  })
}
