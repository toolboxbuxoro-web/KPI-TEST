'use server'

import prisma from "@/lib/db"
import bcrypt from "bcryptjs"

export interface StoreAuthResult {
  success: boolean
  storeId?: string
  storeName?: string
  error?: string
}

/**
 * Authenticate store by login and password
 * Used for store terminal login
 */
export async function authenticateStore(login: string, password: string): Promise<StoreAuthResult> {
  if (!login || !password) {
    return { success: false, error: "Введите логин и пароль" }
  }

  const store = await prisma.store.findUnique({
    where: { login },
    select: {
      id: true,
      name: true,
      password: true,
      isActive: true
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
