import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export async function GET(request, { params }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'school_id is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch course' },
        { status: 500 }
      )
    }
    
    // Add caching headers for better performance
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch course' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'school_id is required' },
        { status: 400 }
      )
    }

    // Fast server-side delete
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete course' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete course' },
      { status: 500 }
    )
  }
}

