# School Dashboard

A Next.js 16 application for managing school admissions, applications, programs, and student communications.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `app/` - Next.js app directory with pages and API routes
- `components/` - React components
- `context/` - React Context providers
- `services/` - Service layer for API calls
- `lib/` - Utility libraries
- `utils/` - Utility functions

## Features

- Authentication with Supabase
- Applications management
- Programs/Courses management
- Chat functionality
- Reports and analytics
- Settings management

## Backend API

All API routes are preserved from the original implementation:
- `/api/chat/*` - Chat endpoints
- `/api/courses/*` - Course management
- `/api/programs/*` - Program management
- `/api/reports/*` - Report endpoints

