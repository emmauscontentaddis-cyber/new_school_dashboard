import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

/**
 * GET /api/reports/pipeline
 * 
 * Optimized pipeline efficiency metrics with single-pass processing.
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

    // Fetch only required timestamp fields
    const { data: applications, error } = await supabase
      .from('applications')
      .select('status, created_at, reviewed_at, accepted_at, rejected_at, enrolled_at')
      .eq('school_id', schoolId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })
      .limit(2000) // Reduced from 3000

    if (error) {
      console.error('Error fetching pipeline data:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch pipeline data' },
        { status: 500 }
      )
    }

    // Single pass processing
    const stages = {
      'pending': 0,
      'under_review': 0,
      'interview_scheduled': 0,
      'accepted': 0,
      'rejected': 0,
      'waitlisted': 0,
      'enrolled': 0
    }

    const stageTimes = {
      'pending_to_review': [],
      'review_to_decision': [],
      'decision_to_enrollment': []
    }

    const total = applications?.length || 0
    
    for (let i = 0; i < total; i++) {
      const app = applications[i]
      const status = app.status || 'pending'
      stages[status] = (stages[status] || 0) + 1

      // Calculate time between stages (optimized)
      if (app.created_at && app.reviewed_at) {
        const time = (new Date(app.reviewed_at) - new Date(app.created_at)) / (1000 * 60 * 60 * 24)
        stageTimes['pending_to_review'].push(time)
      }
      if (app.reviewed_at && (app.accepted_at || app.rejected_at)) {
        const decisionDate = app.accepted_at || app.rejected_at
        const time = (new Date(decisionDate) - new Date(app.reviewed_at)) / (1000 * 60 * 60 * 24)
        stageTimes['review_to_decision'].push(time)
      }
      if (app.accepted_at && app.enrolled_at) {
        const time = (new Date(app.enrolled_at) - new Date(app.accepted_at)) / (1000 * 60 * 60 * 24)
        stageTimes['decision_to_enrollment'].push(time)
      }
    }

    // Calculate averages (optimized)
    const avgTimeByStage = {
      'pending_to_review': stageTimes['pending_to_review'].length > 0
        ? parseFloat((stageTimes['pending_to_review'].reduce((a, b) => a + b, 0) / stageTimes['pending_to_review'].length).toFixed(1))
        : 0,
      'review_to_decision': stageTimes['review_to_decision'].length > 0
        ? parseFloat((stageTimes['review_to_decision'].reduce((a, b) => a + b, 0) / stageTimes['review_to_decision'].length).toFixed(1))
        : 0,
      'decision_to_enrollment': stageTimes['decision_to_enrollment'].length > 0
        ? parseFloat((stageTimes['decision_to_enrollment'].reduce((a, b) => a + b, 0) / stageTimes['decision_to_enrollment'].length).toFixed(1))
        : 0
    }

    // Calculate stages array
    const stagesArray = Object.entries(stages).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 
        ? parseFloat(((count / total) * 100).toFixed(1))
        : 0
    }))

    // Calculate dropoff rates
    const dropoffRates = {
      'pending_to_review': total > 0 
        ? parseFloat((((stages['pending'] || 0) / total) * 100).toFixed(1))
        : 0,
      'review_to_decision': (stages['under_review'] || 0) + (stages['interview_scheduled'] || 0) > 0
        ? parseFloat((((stages['rejected'] || 0) / ((stages['under_review'] || 0) + (stages['interview_scheduled'] || 0))) * 100).toFixed(1))
        : 0,
      'decision_to_enrollment': (stages['accepted'] || 0) > 0
        ? parseFloat(((((stages['accepted'] || 0) - (stages['enrolled'] || 0)) / (stages['accepted'] || 0)) * 100).toFixed(1))
        : 0
    }

    const totalTime = Object.values(avgTimeByStage).reduce((sum, time) => sum + time, 0)

    const duration = performance.now() - startTime
    console.log(`[API] Pipeline efficiency fetched in ${duration.toFixed(2)}ms`)

    return NextResponse.json({
      stages: stagesArray,
      avgTimeByStage,
      dropoffRates,
      totalTime: parseFloat(totalTime.toFixed(1))
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Response-Time': `${duration.toFixed(2)}ms`,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/reports/pipeline:', error)
    
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

