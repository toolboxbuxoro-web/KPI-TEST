const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    const id = 'cmi7dx6o1001x4l2uy6k0c61v'
    try {
        await prisma.employee.delete({
            where: { id }
        })
        console.log(`Deleted employee with ID: ${id}`)
    } catch (e) {
        console.error(`Failed to delete employee: ${e.message}`)
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
