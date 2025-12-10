-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "consentSignedAt" TIMESTAMP(3),
ADD COLUMN     "descriptorUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "faceDescriptor" JSONB;
