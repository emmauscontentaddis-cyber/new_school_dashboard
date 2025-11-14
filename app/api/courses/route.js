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
    
    // Get school_id from request body
    const schoolId = body.school_id

    if (!schoolId) {
      return NextResponse.json(
        { error: 'school_id is required' },
        { status: 400 }
      )
    }

    // Simple course data - all fields, no complex validations
    const courseData = {
      school_id: schoolId,
      title: body.title || 'Untitled Course',
      course_code: body.course_code || null,
      short_description: body.short_description || 'No description',
      description: body.description || null,
      category: body.category || 'General',
      subcategory: body.subcategory || null,
      tags: Array.isArray(body.tags) ? body.tags : (body.tags || []),
      level: body.level || 'mixed',
      duration_weeks: body.duration_weeks || 0,
      duration_hours: body.duration_hours || 0,
      duration_full_time: body.duration_full_time || false,
      credits: body.credits || 0,
      prerequisites: Array.isArray(body.prerequisites) ? body.prerequisites : (body.prerequisites || []),
      provider_name: body.provider_name || 'Unknown Provider',
      provider_type: body.provider_type || 'other',
      provider_website: body.provider_website || null,
      provider_accreditation: Array.isArray(body.provider_accreditation) ? body.provider_accreditation : (body.provider_accreditation || []),
      municipality: body.municipality || null,
      county: body.county || null,
      region: body.region || null,
      address: body.address || null,
      online: body.online || false,
      hybrid: body.hybrid || false,
      flexible: body.flexible || false,
      pace_percentage: body.pace_percentage || 100,
      distance_learning: body.distance_learning || false,
      time_of_day: body.time_of_day || 'day',
      career_paths: Array.isArray(body.career_paths) ? body.career_paths : (body.career_paths || []),
      skills: Array.isArray(body.skills) ? body.skills : (body.skills || []),
      tuition: body.free ? 0 : (parseFloat(body.tuition) || 0),
      currency: body.currency || 'SEK',
      free: body.free || false,
      scholarship: body.scholarship || false,
      student_aid_available: body.student_aid_available || false,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      application_deadline: body.application_deadline || null,
      difficulty_score: body.difficulty_score || 5,
      status: body.status || 'active',
      requirements_text: body.requirements_text || null,
      full_requirements_link: body.full_requirements_link || null,
      course_structure_details: body.course_structure_details || null,
      contact_email: body.contact_email || null,
      contact_phone: body.contact_phone || null,
      contact_website: body.contact_website || null,
      contact_address: body.contact_address || null,
      about_course_benefits: Array.isArray(body.about_course_benefits) ? body.about_course_benefits : (body.about_course_benefits || []),
      learning_outcomes: Array.isArray(body.learning_outcomes) ? body.learning_outcomes : (body.learning_outcomes || []),
      job_opportunities_description: body.job_opportunities_description || null,
      job_opportunities_callout: body.job_opportunities_callout || null,
      job_roles: Array.isArray(body.job_roles) ? body.job_roles : (body.job_roles || []),
      financing_free: body.financing_free || false,
      financing_student_aid: body.financing_student_aid || false,
      financing_transitional_support: body.financing_transitional_support || false,
    }

    // Remove undefined values
    Object.keys(courseData).forEach(key => {
      if (courseData[key] === undefined) {
        delete courseData[key]
      }
    })

    // Fast server-side insert
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
    console.error('Error creating course:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create course' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
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
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch courses' },
        { status: 500 }
      )
    }
    
    // Add caching headers for better performance
    // Revalidate every 60 seconds (can be adjusted based on data freshness needs)
    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}

