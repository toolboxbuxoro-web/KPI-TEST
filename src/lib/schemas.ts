import { z } from "zod"

export const testSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  timeLimit: z.number().min(0).optional(),
})

export const questionSchema = z.object({
  testId: z.string(),
  text: z.string().min(3, "Question text is required"),
  imageUrl: z.string().optional(),
  questionType: z.enum(["single", "multi"]),
  points: z.number().int().min(1, "Points must be at least 1"),
  options: z.array(z.object({
    text: z.string().min(1, "Option text is required"),
    isCorrect: z.boolean(),
  })).min(2, "At least 2 options are required"),
})

export const answerSchema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  selectedOptionIds: z.array(z.string()).min(1, "Выберите хотя бы один вариант"),
})

// Role enum для валидации
export const roleEnum = z.enum(["SUPER_ADMIN", "STORE_MANAGER", "EMPLOYEE"])

export const employeeSchema = z.object({
  // ФИО
  firstName: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  lastName: z.string().min(2, "Фамилия должна содержать минимум 2 символа"),
  middleName: z.string().optional(),
  
  // Контакты
  phone: z.string().optional(),
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
  login: z.string().min(3, "Логин должен быть минимум 3 символа").optional().or(z.literal("")),
  password: z.string().min(6, "Пароль должен быть минимум 6 символов").optional().or(z.literal("")),
  
  // Персональные данные
  birthDate: z.string().optional(), // ISO date string
  
  // Должность и роль
  position: z.string().min(2, "Должность должна содержать минимум 2 символа"),
  role: roleEnum.optional(),
  
  // Привязка к магазину
  storeId: z.string().optional().nullable(),
  
  // Статус
  isActive: z.boolean().optional(),
  
  // Фото
  imageUrl: z.string().optional(),
})
