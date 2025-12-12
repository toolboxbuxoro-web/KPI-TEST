'use server'

import prisma from "@/lib/db"
import bcrypt from "bcryptjs"
import { isIPAllowed } from "@/lib/get-client-ip"

export interface StoreAuthResult {
  success: boolean
  storeId?: string
  storeName?: string
  error?: string
}

/**
 * Authenticate store by login and password
 * Used for store terminal login
 * @param login Store login
 * @param password Store password
 * @param clientIP Client IP address (optional, but required if store has IP restrictions)
 */
export async function authenticateStore(
  login: string, 
  password: string,
  clientIP?: string | null
): Promise<StoreAuthResult> {
  if (!login || !password) {
    return { success: false, error: "Введите логин и пароль" }
  }

  const store = await prisma.store.findUnique({
    where: { login },
    select: {
      id: true,
      name: true,
      password: true,
      isActive: true,
      allowedIPs: true
    }
  })

  if (!store) {
    return { success: false, error: "Неверный логин или пароль" }
  }

  if (!store.isActive) {
    return { success: false, error: "Магазин деактивирован" }
  }

  if (!store.password) {
    return { success: false, error: "Пароль магазина не настроен" }
  }

  // Check IP restrictions
  if (store.allowedIPs && store.allowedIPs.length > 0) {
    if (!clientIP) {
      return { success: false, error: "Не удалось определить IP-адрес" }
    }
    
    if (!isIPAllowed(clientIP, store.allowedIPs)) {
      return { 
        success: false, 
        error: "Доступ с этого IP-адреса запрещён" 
      }
    }
  }

  const passwordMatch = await bcrypt.compare(password, store.password)
  if (!passwordMatch) {
    return { success: false, error: "Неверный логин или пароль" }
  }

  return {
    success: true,
    storeId: store.id,
    storeName: store.name
  }
}
