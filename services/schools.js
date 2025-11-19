import { supabase } from '@/lib/supabase'

export async function updateSchool(schoolId, updates) {
  if (!schoolId) {
    throw new Error('School ID is required to update a school')
  }

  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('schools')
    .update(payload)
    .eq('id', schoolId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

