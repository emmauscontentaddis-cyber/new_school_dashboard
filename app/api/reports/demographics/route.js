import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

/**
 * GET /api/reports/demographics
 * 
 * Optimized demographics report with single-pass processing.
 */
export async function GET(request) {
  const startTime = performance.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'school_id is required' },
        { status: 400 }
      )
    }

    const signal = request.signal
    if (signal?.aborted) {
      return NextResponse.json(
        { error: 'Request aborted' },
        { status: 499 }
      )
    }

    const now = new Date()
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const start = startDate ? new Date(startDate) : defaultStart
    const end = endDate ? new Date(endDate) : now

    // Fetch only additional_info field
    const { data: applications, error } = await supabase
      .from('applications')
      .select('additional_info')
      .eq('school_id', schoolId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .limit(2000) // Reduced from 3000

    if (error) {
      console.error('Error fetching demographics data:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch demographics data' },
        { status: 500 }
      )
    }

    // Single pass aggregation
    const demographics = {
      ageGroups: {},
      genders: {},
      countries: {},
      education: {}
    }

    const total = applications?.length || 0
    
    for (let i = 0; i < total; i++) {
      const app = applications[i]
      const info = app.additional_info || {}
      
      // Age groups
      if (info.age) {
        const ageGroup = info.age < 25 ? '18-24' 
          : info.age < 35 ? '25-34' 
          : info.age < 45 ? '35-44' 
          : '45+'
        demographics.ageGroups[ageGroup] = (demographics.ageGroups[ageGroup] || 0) + 1
      }
      
      // Gender
      if (info.gender) {
        demographics.genders[info.gender] = (demographics.genders[info.gender] || 0) + 1
      }
      
      // Country
      if (info.country) {
        demographics.countries[info.country] = (demographics.countries[info.country] || 0) + 1
      }
      
      // Education level
      if (info.education_level || info.education) {
        const edu = info.education_level || info.education
        demographics.education[edu] = (demographics.education[edu] || 0) + 1
      }
    }

    const duration = performance.now() - startTime
    console.log(`[API] Demographics fetched in ${duration.toFixed(2)}ms`)

    return NextResponse.json(demographics, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Response-Time': `${duration.toFixed(2)}ms`,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/reports/demographics:', error)
    
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      return NextResponse.json(
        { error: 'Request aborted' },
        { status: 499 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

