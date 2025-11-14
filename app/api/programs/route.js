import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export async function POST(request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Get school_id from request (you can pass it in the body or get from auth)
    // For testing, you can pass school_id in the body
    // In production, you'd get it from the authenticated user's session
    const schoolId = body.school_id

    if (!schoolId) {
      return NextResponse.json(
        { error: 'school_id is required. For testing, include it in the request body.' },
        { status: 400 }
      )
    }

    // Prepare course data
    const courseData = {
      title: body.title,
      course_code: body.course_code || null,
      short_description: body.short_description || body.description || '',
      description: body.description || body.short_description || '',
      category: body.category || 'General',
      subcategory: body.subcategory || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      level: body.level || 'mixed',
      duration_weeks: body.duration_weeks || 0,
      duration_hours: body.duration_hours || 0,
      duration_full_time: body.duration_full_time || false,
      credits: body.credits || body.seats || 0,
      prerequisites: Array.isArray(body.prerequisites) ? body.prerequisites : [],
      provider_name: body.provider_name || '',
      provider_type: body.provider_type || 'other',
      provider_website: body.provider_website || null,
      provider_accreditation: Array.isArray(body.provider_accreditation) ? body.provider_accreditation : [],
      municipality: body.municipality || null,
      county: body.county || null,
      region: body.region || null,
      address: body.address || null,
      coordinates_lat: body.coordinates_lat || null,
      coordinates_lng: body.coordinates_lng || null,
      online: body.online || false,
      hybrid: body.hybrid || false,
      career_paths: Array.isArray(body.career_paths) ? body.career_paths : [],
      skills: Array.isArray(body.skills) ? body.skills : [],
      tuition: body.tuition || body.fee || 0,
      currency: body.currency || 'SEK',
      free: body.free || false,
      scholarship: body.scholarship || false,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      application_deadline: body.application_deadline || null,
      flexible: body.flexible || false,
      difficulty_score: body.difficulty_score || 5,
      status: body.status || 'active',
      requirements_text: body.requirements_text || null,
      full_requirements_link: body.full_requirements_link || null,
      course_structure_details: body.course_structure_details || null,
      contact_email: body.contact_email || null,
      contact_phone: body.contact_phone || null,
      contact_website: body.contact_website || null,
      contact_address: body.contact_address || null,
      pace_percentage: body.pace_percentage || 100,
      distance_learning: body.distance_learning || false,
      time_of_day: body.time_of_day || 'day',
      student_aid_available: body.student_aid_available || false,
      about_course_benefits: Array.isArray(body.about_course_benefits) ? body.about_course_benefits : [],
      learning_outcomes: Array.isArray(body.learning_outcomes) ? body.learning_outcomes : [],
      job_opportunities_description: body.job_opportunities_description || null,
      job_opportunities_callout: body.job_opportunities_callout || null,
      job_roles: Array.isArray(body.job_roles) ? body.job_roles : [],
      financing_free: body.financing_free || false,
      financing_student_aid: body.financing_student_aid || false,
      financing_transitional_support: body.financing_transitional_support || false,
      school_id: schoolId,
    }

    // Remove undefined values
    Object.keys(courseData).forEach(key => {
      if (courseData[key] === undefined) {
        delete courseData[key]
      }
    })

    // Insert into database
    const { data, error } = await supabase
      .from('courses')
      .insert([courseData])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create course', details: error },
        { status: 500 }
      )
    }
    
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating program:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create program' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')

    let query = supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch courses' },
        { status: 500 }
      )
    }
    
    // Add caching headers for better performance
    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error fetching programs:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch programs' },
      { status: 500 }
    )
  }
}

