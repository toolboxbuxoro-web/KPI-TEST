import { z } from "zod"

export const testSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
})

export const questionSchema = z.object({
  testId: z.string(),
  text: z.string().min(3, "Question text is required"),
  imageUrl: z.string().optional(),
  questionType: z.enum(["single", "multi"]),
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

export const employeeSchema = z.object({
  firstName: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  lastName: z.string().min(2, "Фамилия должна содержать минимум 2 символа"),
  position: z.string().min(2, "Должность должна содержать минимум 2 символа"),
})
