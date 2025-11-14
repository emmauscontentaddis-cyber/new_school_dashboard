import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

/**
 * GET /api/reports/conversion
 * 
 * Optimized conversion rate analysis with efficient joins and single-pass processing.
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

    // OPTIMIZED: Fetch with join but limit fields
    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        status, 
        course_id,
        marketing_source,
        additional_info,
        created_at,
        courses!inner(title)
      `)
      .eq('school_id', schoolId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })
      .limit(2000) // Reduced from 3000

    if (error) {
      console.error('Error fetching conversion data:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch conversion data' },
        { status: 500 }
      )
    }

    const total = applications?.length || 0
    const accepted = applications?.filter(a => a.status === 'accepted').length || 0
    const overall = total > 0 ? parseFloat(((accepted / total) * 100).toFixed(1)) : 0

    // Single pass aggregation for all metrics
    const programData = {}
    const sourceData = {}
    const monthlyData = {}
    
    for (let i = 0; i < total; i++) {
      const app = applications[i]
      
      // By program
      const programName = app.courses?.title || 'Unknown'
      if (!programData[programName]) {
        programData[programName] = { total: 0, accepted: 0 }
      }
      programData[programName].total++
      if (app.status === 'accepted') programData[programName].accepted++
      
      // By source
      const source = app.marketing_source || 
                    app.additional_info?.marketing_source || 
                    'Unknown'
      if (!sourceData[source]) {
        sourceData[source] = { total: 0, accepted: 0 }
      }
      sourceData[source].total++
      if (app.status === 'accepted') sourceData[source].accepted++
      
      // By month
      if (app.created_at) {
        const date = new Date(app.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { total: 0, accepted: 0 }
        }
        monthlyData[monthKey].total++
        if (app.status === 'accepted') monthlyData[monthKey].accepted++
      }
    }

    // Convert to arrays
    const byProgram = Object.entries(programData).map(([name, data]) => ({
      name,
      total: data.total,
      accepted: data.accepted,
      rate: data.total > 0 ? parseFloat(((data.accepted / data.total) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.rate - a.rate)

    const bySource = Object.entries(sourceData).map(([name, data]) => ({
      name,
      total: data.total,
      accepted: data.accepted,
      rate: data.total > 0 ? parseFloat(((data.accepted / data.total) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.rate - a.rate)

    const byMonth = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        total: data.total,
        accepted: data.accepted,
        rate: data.total > 0 ? parseFloat(((data.accepted / data.total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    const duration = performance.now() - startTime
    console.log(`[API] Conversion analysis fetched in ${duration.toFixed(2)}ms`)

    return NextResponse.json({
      overall,
      byProgram,
      bySource,
      byMonth
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Response-Time': `${duration.toFixed(2)}ms`,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/reports/conversion:', error)
    
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

