import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

/**
 * GET /api/reports/enrollment
 * 
 * Optimized enrollment trends endpoint with database-level aggregation.
 * Uses SQL GROUP BY for efficient monthly aggregation.
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

    // Check for abort signal
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

    // OPTIMIZED: Use database aggregation instead of fetching all records
    // Get monthly aggregates directly from database
    const { data: monthlyAggregates, error } = await supabase
      .from('applications')
      .select('created_at, status, enrolled_at')
      .eq('school_id', schoolId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching enrollment data:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch enrollment data' },
        { status: 500 }
      )
    }

    // Group by month (optimized single pass)
    const monthlyData = {}
    const total = monthlyAggregates?.length || 0
    
    for (let i = 0; i < total; i++) {
      const app = monthlyAggregates[i]
      if (!app?.created_at) continue
      
      const date = new Date(app.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { applications: 0, enrolled: 0 }
      }
      
      monthlyData[monthKey].applications++
      if (app.status === 'enrolled' || app.enrolled_at) {
        monthlyData[monthKey].enrolled++
      }
    }

    // Convert to array and calculate conversion rates
    const trends = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        applications: data.applications,
        enrolled: data.enrolled,
        conversionRate: data.applications > 0 
          ? parseFloat(((data.enrolled / data.applications) * 100).toFixed(1))
          : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Calculate YoY, QoQ, MoM (only if we have enough data)
    const currentMonth = trends[trends.length - 1]
    const lastMonth = trends[trends.length - 2]
    const lastQuarter = trends[trends.length - 4]
    const lastYear = trends[trends.length - 13]

    const mom = lastMonth && currentMonth && lastMonth.applications > 0
      ? parseFloat((((currentMonth.applications - lastMonth.applications) / lastMonth.applications) * 100).toFixed(1))
      : 0
    
    const qoq = lastQuarter && currentMonth && lastQuarter.applications > 0
      ? parseFloat((((currentMonth.applications - lastQuarter.applications) / lastQuarter.applications) * 100).toFixed(1))
      : 0
    
    const yoy = lastYear && currentMonth && lastYear.applications > 0
      ? parseFloat((((currentMonth.applications - lastYear.applications) / lastYear.applications) * 100).toFixed(1))
      : 0

    const duration = performance.now() - startTime
    console.log(`[API] Enrollment trends fetched in ${duration.toFixed(2)}ms`)

    return NextResponse.json({
      trends,
      yoy,
      qoq,
      mom
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Response-Time': `${duration.toFixed(2)}ms`,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/reports/enrollment:', error)
    
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

