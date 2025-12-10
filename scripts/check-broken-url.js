const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    const employees = await prisma.employee.findMany({
        where: {
            imageUrl: {
                contains: 'bbt1.jpg'
            }
        }
    })

    if (employees.length > 0) {
        console.log(`Found ${employees.length} employees with broken URL:`)
        employees.forEach(emp => {
            console.log(`- ${emp.firstName} ${emp.lastName} (${emp.id}): ${emp.imageUrl}`)
        })
    } else {
        console.log("No employees with broken URL found")
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
