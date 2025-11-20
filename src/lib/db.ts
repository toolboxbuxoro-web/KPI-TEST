import { PrismaClient } from '@prisma/client'
import { auth } from '@/auth'

// Create a base client without extensions for audit logging
const basePrismaClient = new PrismaClient()

const prismaClientSingleton = () => {
  return basePrismaClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Only audit mutations
          const auditOperations = ['create', 'update', 'delete', 'createMany', 'updateMany', 'deleteMany']
          if (!auditOperations.includes(operation)) {
            return query(args)
          }

          // Get current user (this might not work in all contexts, e.g. background jobs)
          // In Server Actions, 'auth()' should work.
          let userId = 'system'
          try {
             const session = await auth()
             if (session?.user?.email) userId = session.user.email // Use email or ID
          } catch (e) {
            // Ignore auth errors during build/seed
          }

          const result = await query(args)

          // Async logging to avoid blocking the main request too much
          // Use the base client to avoid infinite loop and connection leaks
          try {
            await basePrismaClient.auditLog.create({
              data: {
                userId,
                action: operation,
                entity: model,
                // Capturing before/after is complex in generic middleware without performance hit.
                // For now, we log the operation and args.
                // To do full diffing, we'd need to read before write.
                after: JSON.stringify(args), 
              }
            })
          } catch (error) {
            console.error("Failed to create audit log", error)
          }

          return result
        },
      },
    },
  })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
