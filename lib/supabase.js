import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    // Only log errors on client side
    console.error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file')
    console.error('Example .env.local file:')
    console.error('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key')
  }
}

// Create client with empty strings as fallback (will show errors if not configured)
// This is safe to create on both server and client
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

