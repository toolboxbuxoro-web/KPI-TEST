/*
  Warnings:

  - You are about to drop the column `timestamp` on the `AuditLog` table. All the data in the column will be lost.
  - The `selectedOptionIds` column on the `EmployeeAnswer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `EmployeeTestSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `score` on the `EmployeeTestSession` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - The `questionType` column on the `Question` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `AnswerOption` table without a default value. This is not possible if the table is not empty.
  - Made the column `score` on table `EmployeeTestSession` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('single', 'multi');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('pending', 'completed');

-- AlterTable
ALTER TABLE "AnswerOption" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "isCorrect" SET DEFAULT false;

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "timestamp",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "details" TEXT,
ALTER COLUMN "before" SET DATA TYPE TEXT,
ALTER COLUMN "after" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "EmployeeAnswer" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "selectedOptionIds",
ADD COLUMN     "selectedOptionIds" TEXT[];

-- AlterTable
ALTER TABLE "EmployeeTestSession" ADD COLUMN     "correctAnswers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "incorrectAnswers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalQuestions" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "status",
ADD COLUMN     "status" "SessionStatus" NOT NULL DEFAULT 'pending',
ALTER COLUMN "score" SET NOT NULL,
ALTER COLUMN "score" SET DEFAULT 0,
ALTER COLUMN "score" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "questionType",
ADD COLUMN     "questionType" "QuestionType" NOT NULL DEFAULT 'single';

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "passingScore" INTEGER NOT NULL DEFAULT 70;

-- CreateTable
CREATE TABLE "TestAssignment" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "TestAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestAssignment_testId_idx" ON "TestAssignment"("testId");

-- CreateIndex
CREATE INDEX "TestAssignment_employeeId_idx" ON "TestAssignment"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "TestAssignment_testId_employeeId_key" ON "TestAssignment"("testId", "employeeId");

-- CreateIndex
CREATE INDEX "AnswerOption_questionId_idx" ON "AnswerOption"("questionId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "EmployeeAnswer_sessionId_idx" ON "EmployeeAnswer"("sessionId");

-- CreateIndex
CREATE INDEX "EmployeeAnswer_questionId_idx" ON "EmployeeAnswer"("questionId");

-- CreateIndex
CREATE INDEX "EmployeeTestSession_employeeId_idx" ON "EmployeeTestSession"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeTestSession_testId_idx" ON "EmployeeTestSession"("testId");

-- CreateIndex
CREATE INDEX "EmployeeTestSession_status_idx" ON "EmployeeTestSession"("status");

-- CreateIndex
CREATE INDEX "Question_testId_idx" ON "Question"("testId");

-- AddForeignKey
ALTER TABLE "TestAssignment" ADD CONSTRAINT "TestAssignment_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAssignment" ADD CONSTRAINT "TestAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
