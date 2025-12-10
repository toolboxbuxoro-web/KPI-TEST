const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const employee = await prisma.employee.findFirst({
    where: {
        imageUrl: {
            not: null
        }
    }
  })
  
  if (employee) {
    console.log(`Found employee: ${employee.firstName} ${employee.lastName}`)
    console.log(`ID: ${employee.id}`)
    console.log(`Image: ${employee.imageUrl}`)
  } else {
    console.log("No employee with image found")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
