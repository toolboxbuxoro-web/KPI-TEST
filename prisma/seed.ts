import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Clear existing data
  await prisma.employeeAnswer.deleteMany()
  await prisma.employeeTestSession.deleteMany()
  await prisma.answerOption.deleteMany()
  await prisma.question.deleteMany()
  await prisma.test.deleteMany()
  await prisma.attendanceRecord.deleteMany()
  await prisma.store.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.auditLog.deleteMany()

  console.log('Cleared existing data')

  // Create stores
  const stores = await Promise.all([
    prisma.store.create({
      data: {
        name: 'Центральный',
        address: 'ул. Центральная, 1',
        workStartHour: 8,
        workEndHour: 18,
      },
    }),
    prisma.store.create({
      data: {
        name: 'Северный',
        address: 'ул. Северная, 25',
        workStartHour: 9,
        workEndHour: 19,
      },
    }),
    prisma.store.create({
      data: {
        name: 'Южный',
        address: 'ул. Южная, 100',
        workStartHour: 8,
        workEndHour: 18,
      },
    }),
  ])

  console.log('Created stores:', stores.length)

  // Create employees
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        firstName: 'Иван',
        lastName: 'Иванов',
        position: 'Менеджер',
      },
    }),
    prisma.employee.create({
      data: {
        firstName: 'Мария',
        lastName: 'Петрова',
        position: 'Разработчик',
      },
    }),
    prisma.employee.create({
      data: {
        firstName: 'Алексей',
        lastName: 'Сидоров',
        position: 'Дизайнер',
      },
    }),
  ])

  console.log('Created employees:', employees.length)

  // Create Test 1: Техника безопасности
  const test1 = await prisma.test.create({
    data: {
      title: 'Техника безопасности на рабочем месте',
      description: 'Основные правила техники безопасности в офисе',
      createdBy: 'admin',
      passingScore: 70,
    },
  })

  // Questions for Test 1
  const q1 = await prisma.question.create({
    data: {
      testId: test1.id,
      text: 'Что нужно сделать при обнаружении пожара в офисе?',
      questionType: 'single',
      options: {
        create: [
          { text: 'Немедленно покинуть помещение и вызвать пожарную службу', isCorrect: true },
          { text: 'Попытаться потушить огонь самостоятельно', isCorrect: false },
          { text: 'Продолжить работу, если огонь небольшой', isCorrect: false },
          { text: 'Закрыть все окна и двери', isCorrect: false },
        ],
      },
    },
  })

  const q2 = await prisma.question.create({
    data: {
      testId: test1.id,
      text: 'Какие действия помогут предотвратить травмы на рабочем месте? (выберите все правильные)',
      questionType: 'multi',
      options: {
        create: [
          { text: 'Содержать рабочее место в чистоте и порядке', isCorrect: true },
          { text: 'Использовать эргономичную мебель', isCorrect: true },
          { text: 'Работать без перерывов для повышения производительности', isCorrect: false },
          { text: 'Соблюдать правила работы с электроприборами', isCorrect: true },
        ],
      },
    },
  })

  const q3 = await prisma.question.create({
    data: {
      testId: test1.id,
      text: 'Как часто нужно делать перерывы при работе за компьютером?',
      questionType: 'single',
      options: {
        create: [
          { text: 'Каждые 45-60 минут', isCorrect: true },
          { text: 'Раз в 3 часа', isCorrect: false },
          { text: 'Только когда устанешь', isCorrect: false },
          { text: 'Перерывы не нужны', isCorrect: false },
        ],
      },
    },
  })

  console.log('Created test 1 with 3 questions')

  // Create Test 2: Корпоративная культура
  const test2 = await prisma.test.create({
    data: {
      title: 'Корпоративная культура и этика',
      description: 'Правила поведения и взаимодействия в компании',
      createdBy: 'admin',
      passingScore: 80,
    },
  })

  await prisma.question.create({
    data: {
      testId: test2.id,
      text: 'Что является примером профессионального поведения?',
      questionType: 'single',
      options: {
        create: [
          { text: 'Уважительное общение с коллегами', isCorrect: true },
          { text: 'Обсуждение личной жизни коллег', isCorrect: false },
          { text: 'Игнорирование сообщений от команды', isCorrect: false },
          { text: 'Опоздания на встречи', isCorrect: false },
        ],
      },
    },
  })

  await prisma.question.create({
    data: {
      testId: test2.id,
      text: 'Какие принципы важны для командной работы? (выберите все правильные)',
      questionType: 'multi',
      options: {
        create: [
          { text: 'Открытая коммуникация', isCorrect: true },
          { text: 'Взаимопомощь', isCorrect: true },
          { text: 'Конкуренция между членами команды', isCorrect: false },
          { text: 'Ответственность за свои задачи', isCorrect: true },
        ],
      },
    },
  })

  console.log('Created test 2 with 2 questions')

  // Create Test 3: Работа с клиентами
  const test3 = await prisma.test.create({
    data: {
      title: 'Работа с клиентами',
      description: 'Основы клиентского сервиса и коммуникации',
      createdBy: 'admin',
      passingScore: 75,
    },
  })

  await prisma.question.create({
    data: {
      testId: test3.id,
      text: 'Как правильно реагировать на жалобу клиента?',
      questionType: 'single',
      options: {
        create: [
          { text: 'Выслушать, извиниться и предложить решение', isCorrect: true },
          { text: 'Объяснить, что клиент неправ', isCorrect: false },
          { text: 'Переадресовать на другого сотрудника', isCorrect: false },
          { text: 'Игнорировать жалобу', isCorrect: false },
        ],
      },
    },
  })

  await prisma.question.create({
    data: {
      testId: test3.id,
      text: 'Что важно при общении с клиентом? (выберите все правильные)',
      questionType: 'multi',
      options: {
        create: [
          { text: 'Вежливость и уважение', isCorrect: true },
          { text: 'Активное слушание', isCorrect: true },
          { text: 'Быстрые ответы, даже если информация неточная', isCorrect: false },
          { text: 'Профессионализм', isCorrect: true },
        ],
      },
    },
  })

  await prisma.question.create({
    data: {
      testId: test3.id,
      text: 'Какой тон голоса следует использовать при общении с клиентом?',
      questionType: 'single',
      options: {
        create: [
          { text: 'Дружелюбный и профессиональный', isCorrect: true },
          { text: 'Строгий и формальный', isCorrect: false },
          { text: 'Безразличный', isCorrect: false },
          { text: 'Зависит от настроения', isCorrect: false },
        ],
      },
    },
  })

  console.log('Created test 3 with 3 questions')

  console.log('\n✅ Seeding completed successfully!')
  console.log(`\n📊 Summary:`)
  console.log(`- Stores: ${stores.length}`)
  console.log(`- Employees: ${employees.length}`)
  console.log(`- Tests: 3`)
  console.log(`- Total Questions: 8`)
  console.log(`\n🏪 Stores:`)
  stores.forEach(store => {
    console.log(`- ${store.name}: ${store.address}`)
  })
  console.log(`\n🔗 Employee Links:`)
  employees.forEach(emp => {
    console.log(`- ${emp.firstName} ${emp.lastName}: http://localhost:3000/employee/${emp.id}`)
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
