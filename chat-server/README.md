# Chat Server

Socket.IO server for real-time chat communication between students and schools.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the parent directory (School NEw) or here with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3001
ALLOWED_ORIGINS=http://localhost:3020,http://localhost:3000
```

The server will automatically use `NEXT_PUBLIC_SUPABASE_URL` from your Next.js app's environment variables, or you can set `SUPABASE_URL` directly.

## Running

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `PORT`: Server port (default: 3001)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

## API Endpoints

### POST /api/messages
Send a message via REST API.

### GET /api/messages?studentId=&schoolId=
Get chat history for a conversation.

## Socket.IO Events

See main CHAT_IMPLEMENTATION.md for full event documentation.






