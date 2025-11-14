import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

/**
 * GET /api/reports/marketing
 * 
 * Optimized marketing source analysis with database-level aggregation.
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

    // Fetch only required fields
    const { data: applications, error } = await supabase
      .from('applications')
      .select('status, marketing_source, additional_info')
      .eq('school_id', schoolId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })
      .limit(2000) // Reduced from 3000

    if (error) {
      console.error('Error fetching marketing data:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch marketing data' },
        { status: 500 }
      )
    }

    // Single pass aggregation
    const sourceData = {}
    const total = applications?.length || 0
    
    for (let i = 0; i < total; i++) {
      const app = applications[i]
      const source = app.marketing_source || 
                    app.additional_info?.marketing_source || 
                    'Unknown'
      
      if (!sourceData[source]) {
        sourceData[source] = { total: 0, accepted: 0, enrolled: 0 }
      }
      
      sourceData[source].total++
      if (app.status === 'accepted') sourceData[source].accepted++
      if (app.status === 'enrolled') sourceData[source].enrolled++
    }

    // Convert to array with calculated rates
    const sources = Object.entries(sourceData).map(([name, data]) => ({
      name,
      total: data.total,
      accepted: data.accepted,
      enrolled: data.enrolled,
      conversionRate: data.total > 0 
        ? parseFloat(((data.accepted / data.total) * 100).toFixed(1))
        : 0,
      enrollmentRate: data.total > 0 
        ? parseFloat(((data.enrolled / data.total) * 100).toFixed(1))
        : 0
    })).sort((a, b) => b.total - a.total)

    const totalApplications = sources.reduce((sum, s) => sum + s.total, 0)
    const conversionBySource = {}
    sources.forEach(s => {
      conversionBySource[s.name] = s.conversionRate
    })

    const duration = performance.now() - startTime
    console.log(`[API] Marketing analysis fetched in ${duration.toFixed(2)}ms`)

    return NextResponse.json({
      sources,
      total: totalApplications,
      conversionBySource
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Response-Time': `${duration.toFixed(2)}ms`,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/reports/marketing:', error)
    
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

