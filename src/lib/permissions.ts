/**
 * Система прав доступа на основе ролей
 */

export type Role = 'SUPER_ADMIN' | 'STORE_MANAGER' | 'EMPLOYEE'

// Определение прав для каждой роли
export const PERMISSIONS = {
  SUPER_ADMIN: [
    // Полный доступ ко всему
    'employees.*',
    'stores.*',
    'tests.*',
    'attendance.*',
    'audit.*',
    'settings.*',
  ],
  STORE_MANAGER: [
    // Управление сотрудниками своего магазина
    'employees.read',
    'employees.create',
    'employees.update',
    // Посещаемость
    'attendance.read',
    'attendance.update',
    'attendance.export',
    // Тесты
    'tests.read',
    'tests.assign',
  ],
  EMPLOYEE: [
    // Личный кабинет
    'profile.read',
    'profile.update',
    // Отметка посещаемости
    'attendance.check',
    // Прохождение тестов
    'tests.take',
  ],
} as const

/**
 * Проверка наличия права у роли
 */
export function hasPermission(role: Role | undefined, permission: string): boolean {
  if (!role) return false
  
  // SUPER_ADMIN имеет доступ ко всему
  if (role === 'SUPER_ADMIN') return true
  
  const rolePermissions = PERMISSIONS[role]
  if (!rolePermissions) return false
  
  // Проверяем точное совпадение или wildcard
  return rolePermissions.some(p => {
    if (p === permission) return true
    // Проверка wildcard (например, 'employees.*' покрывает 'employees.read')
    if (p.endsWith('.*')) {
      const prefix = p.slice(0, -2)
      return permission.startsWith(prefix + '.')
    }
    return false
  })
}

/**
 * Проверка доступа к ресурсу магазина
 */
export function canAccessStore(
  userRole: Role | undefined, 
  userStoreId: string | null | undefined, 
  targetStoreId: string | null | undefined
): boolean {
  if (!userRole) return false
  
  // SUPER_ADMIN имеет доступ ко всем магазинам
  if (userRole === 'SUPER_ADMIN') return true
  
  // STORE_MANAGER имеет доступ только к своему магазину
  if (userRole === 'STORE_MANAGER') {
    return userStoreId === targetStoreId
  }
  
  // EMPLOYEE не имеет доступа к управлению магазинами
  return false
}

/**
 * Получение списка разрешенных страниц для роли
 */
export function getAllowedPages(role: Role | undefined): string[] {
  if (!role) return []
  
  if (role === 'SUPER_ADMIN') {
    return [
      '/admin',
      '/admin/employees',
      '/admin/stores',
      '/admin/tests',
      '/admin/attendance',
      '/admin/audit',
    ]
  }
  
  if (role === 'STORE_MANAGER') {
    return [
      '/admin',
      '/admin/employees',
      '/admin/attendance',
      '/admin/tests',
    ]
  }
  
  // EMPLOYEE - только личный кабинет
  return ['/profile', '/check']
}

/**
 * Получение лейбла роли на русском
 */
export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    SUPER_ADMIN: 'Администратор',
    STORE_MANAGER: 'Менеджер магазина',
    EMPLOYEE: 'Сотрудник',
  }
  return labels[role] || 'Неизвестно'
}
