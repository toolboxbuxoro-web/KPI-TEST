# KPI-TEST

Toolbox KPI Testing System - Comprehensive employee assessment and testing platform.

## Features

- 📝 **Test Management**: Create and manage tests with single/multiple choice questions
- 👥 **Employee Management**: Track employees and assign tests
- 📊 **Analytics Dashboard**: View statistics, leaderboards, and performance metrics
- ✅ **Test Taking**: Interactive test interface with progress tracking
- 🎯 **Scoring System**: Automatic grading with configurable passing thresholds
- 📋 **Audit Logging**: Track all system changes and user actions
- 🖼️ **Image Support**: Add images to questions via UploadThing
- 📤 **Export**: Export employee data and test results to Excel

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **UI**: Tailwind CSS + shadcn/ui components
- **Caching**: Redis (Upstash)
- **File Upload**: UploadThing

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis instance (optional, for caching)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/toolboxbuxoro-web/KPI-TEST.git
cd KPI-TEST
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
KIOSK_JWT_SECRET="your-kiosk-jwt-secret" # optional (falls back to NEXTAUTH_SECRET)
KIOSK_JWT_TTL_SECONDS="43200"            # optional (12h default)
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
UPLOADTHING_TOKEN="..."
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Seed the database (optional):
```bash
npx tsx prisma/seed.ts
```

6. Start the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── prisma/              # Database schema and migrations
├── scripts/             # Utility scripts (e.g., seed scripts)
├── src/
│   ├── app/            # Next.js app router pages
│   │   ├── actions/    # Server actions
│   │   ├── admin/      # Admin dashboard pages
│   │   ├── api/        # API routes
│   │   ├── employee/   # Employee pages
│   │   ├── login/      # Authentication
│   │   └── tests/      # Test-taking interface
│   ├── components/     # React components
│   │   ├── admin/      # Admin-specific components
│   │   └── ui/         # shadcn/ui components
│   ├── lib/            # Utilities and configurations
│   └── hooks/          # Custom React hooks
```

## Usage

### Admin Access

Navigate to `/admin` to access the admin dashboard where you can:
- Create and manage tests
- Add and manage employees
- View test results and analytics
- Monitor system audit logs

### Employee Testing

Employees can access their assigned tests at `/employee/[id]` and take tests at `/tests/[sessionId]`.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npx prisma studio` - Open Prisma Studio
- `npx tsx scripts/seed-assessment-test.ts` - Import assessment questions

## License

MIT
