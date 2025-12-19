# Audit: текущий публичный flow и утечки через server actions (до фикса)

Дата: 2025-12-18  
Scope: **только фиксация текущих точек вызова и утечек** для server actions `getAllFaceDescriptors`, `getEmployee`, `registerAttendance`.

## Кратко (что было возможно)
- **Экcфильтрация биометрии + PII**: получить список *всех* сотрудников с `consentSignedAt != null` и `isActive = true` вместе с `faceDescriptor` (128 float) и ФИО.
- **Экcфильтрация карточки сотрудника**: получить запись сотрудника по `id` вместе с `documents` (и прочими полями модели `Employee`).
- **Подделка посещаемости**: создать/закрыть отметку посещаемости по произвольному `employeeId` (и с произвольным `storeId`, если он существует в БД).

## Где это вызывалось (точки входа)
### Kiosk/Terminal UI (без NextAuth-сессии)
- `src/components/attendance-flow.tsx`:
  - делает store-login через `authenticateStore(login, password, clientIP)` и сохраняет `storeId` в `localStorage` (`toolbox_kiosk_store_id`),
  - затем рендерит `<AttendanceScanner preselectedStoreId={storeId} />` (kiosk режим).
- `src/components/admin/attendance-scanner.tsx` (client component):
  - на старте вызывает `getAllFaceDescriptors()` для загрузки базы лиц,
  - при совпадении лица вызывает `getEmployee(match.label)` для загрузки карточки,
  - затем вызывает `registerAttendance(employeeId, type, selectedStoreId)` для записи входа/выхода.

> Важно: `AttendanceScanner` — **client** компонент и импортирует server actions напрямую, поэтому эти действия могли выполняться **без NextAuth** (kiosk режим).

## 1) `getAllFaceDescriptors()` — утечка биометрии + ФИО
### Реализация
- Файл: `src/app/actions/face-recognition.ts`
- Проблема: **нет проверки `auth()` / роли** в `getAllFaceDescriptors()`.
- Возвращаемые данные:
  - `id`
  - `firstName`, `lastName`
  - `descriptor` = `faceDescriptor` (128 float значений)
- Охват: **все сотрудники**, удовлетворяющие:
  - `consentSignedAt: { not: null }`
  - `isActive: true`
  - и у кого `faceDescriptor !== null`
- Дополнительно:
  - кешируется в Redis: ключ `face:descriptors:all`
  - TTL: 5 минут
  - **не фильтруется по `storeId`** (получается “all-stores” набор).

### Точка вызова
- `src/components/admin/attendance-scanner.tsx` — загрузка “базы лиц” перед созданием `FaceMatcher`.

## 2) `getEmployee(id)` — утечка расширенной карточки сотрудника + documents
### Реализация
- Файл: `src/app/actions/employee.ts`
- Проблема: в `getEmployee()` **намеренно отключена** авторизация:
  - комментарий “Allow public access for scanner kiosk mode”,
  - `auth()` и проверка сессии закомментированы.
- Запрос:
  - `prisma.employee.findUnique({ where: { id }, include: { documents: true } })`
- Следствие:
  - возвращается **вся модель `Employee`** (включая чувствительные поля, если они есть в схеме, например `password`, `faceDescriptor`, `consentSignedAt` и т.п.) **плюс** `documents` (URL/имена/типы/размеры документов).

### Точка вызова
- `src/components/admin/attendance-scanner.tsx` — после face-match подгружается карточка сотрудника для UI/логики.

## 3) `registerAttendance(employeeId, type, storeId?, branch?)` — подделка отметок
### Реализация
- Файл: `src/app/actions/attendance.ts`
- Проблема: **нет проверки `auth()` / kiosk token** в `registerAttendance()`.
- Поведение:
  - принимает `employeeId` и `type` (`in|out`),
  - опционально принимает `storeId` и лишь проверяет, что магазин существует,
  - создаёт/обновляет запись посещаемости за текущий день.
- Следствие:
  - можно инициировать “вход/выход” **за любого сотрудника** по `employeeId`,
  - можно указать любой существующий `storeId` (если передать параметр).

### Точка вызова
- `src/components/admin/attendance-scanner.tsx` — после получения `emp.id` вызывает `registerAttendance(emp.id, scanMode, selectedStoreId)`.

## Примечание о практической эксплуатации
Поскольку эти функции — **server actions**, а часть вызовов идёт из **client** компонента, отсутствие проверок означает, что:
- их можно было вызвать из kiosk-потока без NextAuth,
- и/или теоретически дергать напрямую (как server action вызов) при доступности action reference на клиенте.








