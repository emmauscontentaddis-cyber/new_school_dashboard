'use client'

import { useState, useEffect } from 'react'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Switch from '@/components/ui/Switch'
import { getCachedSchoolId } from '@/utils/userCache'

export default function NewProgramForm({ programId, onClose, onSuccess }) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Basic info
  const [title, setTitle] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [shortDesc, setShortDesc] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [tags, setTags] = useState('')
  const [level, setLevel] = useState('mixed')
  const [difficultyScore, setDifficultyScore] = useState('5')

  // Delivery & schedule
  const [modality, setModality] = useState('On-campus')
  const [online, setOnline] = useState(false)
  const [hybrid, setHybrid] = useState(false)
  const [weeks, setWeeks] = useState('0')
  const [hours, setHours] = useState('0')
  const [credits, setCredits] = useState('0')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [pace, setPace] = useState('100')
  const [timeOfDay, setTimeOfDay] = useState('day')
  const [flexible, setFlexible] = useState(false)
  const [distanceLearning, setDistanceLearning] = useState(false)
  const [durationFullTime, setDurationFullTime] = useState(false)

  // Provider & location
  const [providerName, setProviderName] = useState('')
  const [providerType, setProviderType] = useState('university')
  const [providerWebsite, setProviderWebsite] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [county, setCounty] = useState('')
  const [region, setRegion] = useState('')
  const [address, setAddress] = useState('')
  const [providerAccreditation, setProviderAccreditation] = useState('')

  // Cost & availability
  const [tuition, setTuition] = useState('0')
  const [currency, setCurrency] = useState('SEK')
  const [isFree, setIsFree] = useState(false)
  const [scholarship, setScholarship] = useState(false)
  const [studentAid, setStudentAid] = useState(false)
  const [status, setStatus] = useState('active')

  // Additional fields
  const [prerequisites, setPrerequisites] = useState('')
  const [careerPaths, setCareerPaths] = useState('')
  const [skills, setSkills] = useState('')
  const [requirementsText, setRequirementsText] = useState('')
  const [fullRequirementsLink, setFullRequirementsLink] = useState('')
  const [courseStructureDetails, setCourseStructureDetails] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactWebsite, setContactWebsite] = useState('')
  const [contactAddress, setContactAddress] = useState('')

  // New fields: Course Benefits, Learning Outcomes, Job Opportunities, Job Roles, Financing
  const [aboutCourseBenefits, setAboutCourseBenefits] = useState('')
  const [learningOutcomes, setLearningOutcomes] = useState('')
  const [jobOpportunitiesDescription, setJobOpportunitiesDescription] = useState('')
  const [jobOpportunitiesCallout, setJobOpportunitiesCallout] = useState('')
  const [jobRoles, setJobRoles] = useState('')
  const [financingFree, setFinancingFree] = useState(false)
  const [financingStudentAid, setFinancingStudentAid] = useState(false)
  const [financingTransitionalSupport, setFinancingTransitionalSupport] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const courseData = {
        title: title || 'Untitled Course',
        course_code: courseCode || null,
        short_description: shortDesc || 'No description',
        description: description || null,
        category: category || 'General',
        subcategory: subcategory || null,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        level: level || 'mixed',
        duration_weeks: Number(weeks) || 0,
        duration_hours: Number(hours) || 0,
        duration_full_time: durationFullTime || false,
        credits: Number(credits) || 0,
        prerequisites: prerequisites ? prerequisites.split(',').map((p) => p.trim()).filter(Boolean) : [],
        provider_name: providerName || 'Unknown Provider',
        provider_type: providerType || 'other',
        provider_website: providerWebsite || null,
        provider_accreditation: providerAccreditation ? providerAccreditation.split(',').map((a) => a.trim()).filter(Boolean) : [],
        municipality: municipality || null,
        county: county || null,
        region: region || null,
        address: address || null,
        online: online || false,
        hybrid: hybrid || false,
        flexible: flexible || false,
        pace_percentage: Number(pace) || 100,
        distance_learning: distanceLearning || false,
        time_of_day: timeOfDay || 'day',
        career_paths: careerPaths ? careerPaths.split(',').map((p) => p.trim()).filter(Boolean) : [],
        skills: skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        tuition: isFree ? 0 : (parseFloat(tuition) || 0),
        currency: currency || 'SEK',
        free: isFree || false,
        scholarship: scholarship || false,
        student_aid_available: studentAid || false,
        start_date: startDate || null,
        end_date: endDate || null,
        application_deadline: deadline || null,
        difficulty_score: Number(difficultyScore) || 5,
        status: status || 'active',
        requirements_text: requirementsText || null,
        full_requirements_link: fullRequirementsLink || null,
        course_structure_details: courseStructureDetails || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        contact_website: contactWebsite || null,
        contact_address: contactAddress || null,
        about_course_benefits: aboutCourseBenefits ? aboutCourseBenefits.split('\n').map(b => b.trim()).filter(Boolean) : [],
        learning_outcomes: learningOutcomes ? learningOutcomes.split('\n').map(o => o.trim()).filter(Boolean) : [],
        job_opportunities_description: jobOpportunitiesDescription || null,
        job_opportunities_callout: jobOpportunitiesCallout || null,
        job_roles: jobRoles ? jobRoles.split('\n').map(line => {
          if (!line) return null
          const parts = line.split('|')
          if (parts.length >= 2) {
            return { title: parts[0].trim(), description: parts.slice(1).join('|').trim() }
          } else if (parts.length === 1) {
            return { title: parts[0].trim(), description: '' }
          }
          return null
        }).filter(Boolean) : [],
        financing_free: financingFree || false,
        financing_student_aid: financingStudentAid || false,
        financing_transitional_support: financingTransitionalSupport || false,
      }

      // Get school_id and insert directly via API
      const schoolId = await getCachedSchoolId()
      if (!schoolId) {
        throw new Error('User must be associated with a school')
      }

      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...courseData,
          school_id: schoolId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to register course')
      }
      
      setSuccess('Course registered successfully!')
      
      // Reset form
      setTitle('')
      setCourseCode('')
      setShortDesc('')
      setDescription('')
      setCategory('')
      setSubcategory('')
      setTags('')
      setLevel('mixed')
      setDifficultyScore('5')
      setModality('On-campus')
      setOnline(false)
      setHybrid(false)
      setWeeks('0')
      setHours('0')
      setCredits('0')
      setStartDate('')
      setEndDate('')
      setDeadline('')
      setPace('100')
      setTimeOfDay('day')
      setFlexible(false)
      setDistanceLearning(false)
      setDurationFullTime(false)
      setProviderName('')
      setProviderType('university')
      setProviderWebsite('')
      setMunicipality('')
      setCounty('')
      setRegion('')
      setAddress('')
      setProviderAccreditation('')
      setTuition('0')
      setCurrency('SEK')
      setIsFree(false)
      setScholarship(false)
      setStudentAid(false)
      setStatus('active')
      setPrerequisites('')
      setCareerPaths('')
      setSkills('')
      setRequirementsText('')
      setFullRequirementsLink('')
      setCourseStructureDetails('')
      setContactEmail('')
      setContactPhone('')
      setContactWebsite('')
      setContactAddress('')
      setAboutCourseBenefits('')
      setLearningOutcomes('')
      setJobOpportunitiesDescription('')
      setJobOpportunitiesCallout('')
      setJobRoles('')
      setFinancingFree(false)
      setFinancingStudentAid(false)
      setFinancingTransitionalSupport(false)
      
      // Close modal and refresh list after a brief delay to show success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result)
        }
        if (onClose) {
          onClose()
        }
      }, 1500)
      
    } catch (err) {
      console.error('Error creating course:', err)
      setError(err.message || 'Failed to register course. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {programId ? 'Edit Program' : 'Register New Course'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
            disabled={loading}
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl m-6">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl m-6">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span>{success}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-10">
        {/* Basic Information */}
        <section className="space-y-5">
          <div className="pb-2">
            <h3 className="text-xl font-semibold text-gray-900 mb-1.5">Basic Information</h3>
            <p className="text-sm text-gray-500">Enter the essential details about your course</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title" disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Course Code</label>
              <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="e.g., CS101, MBA-001" disabled={loading} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Tags</label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Separate tags with commas" disabled={loading} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Short description</label>
              <Textarea rows={3} value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder="A brief overview that will appear in listings..." disabled={loading} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Full description</label>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Comprehensive description of the course content, objectives, and outcomes..." disabled={loading} />
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-5 pt-6 border-t border-gray-100">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} disabled={loading}>
                <option value="">Select category...</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Business">Business</option>
                <option value="Creative">Creative</option>
                <option value="Education">Education</option>
                <option value="Crafts">Crafts</option>
                <option value="Service">Service</option>
                <option value="Engineering">Engineering</option>
                <option value="Science">Science</option>
                <option value="Arts">Arts</option>
                <option value="Language">Language</option>
                <option value="Professional">Professional</option>
                <option value="Law">Law</option>
                <option value="Environment">Environment</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Subcategory</label>
              <Input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="Optional" disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Level</label>
              <Select value={level} onChange={(e) => setLevel(e.target.value)} disabled={loading}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="mixed">Mixed</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Difficulty</label>
              <Input type="number" min="1" max="10" value={difficultyScore} onChange={(e) => setDifficultyScore(e.target.value)} disabled={loading} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-5 pt-6 border-t border-gray-100">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Prerequisites</label>
              <Textarea rows={2} value={prerequisites} onChange={(e) => setPrerequisites(e.target.value)} placeholder="Separate with commas" disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Skills</label>
              <Textarea rows={2} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Separate with commas" disabled={loading} />
            </div>
          </div>
          <div className="space-y-1.5 pt-6 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700">Career Paths</label>
            <Textarea rows={2} value={careerPaths} onChange={(e) => setCareerPaths(e.target.value)} placeholder="Separate with commas" disabled={loading} />
          </div>
        </section>

        {/* Course Benefits & Learning Outcomes */}
        <section className="space-y-5">
          <div className="pb-2">
            <h3 className="text-xl font-semibold text-gray-900 mb-1.5">Course Benefits & Learning Outcomes</h3>
            <p className="text-sm text-gray-500">Describe the benefits and learning outcomes of this course</p>
          </div>
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">About Course Benefits</label>
              <Textarea 
                rows={5} 
                value={aboutCourseBenefits} 
                onChange={(e) => setAboutCourseBenefits(e.target.value)} 
                placeholder="Enter one benefit per line" 
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1.5">Enter one benefit per line</p>
            </div>
            <div className="space-y-1.5 pt-6 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700">Learning Outcomes</label>
              <Textarea 
                rows={5} 
                value={learningOutcomes} 
                onChange={(e) => setLearningOutcomes(e.target.value)} 
                placeholder="Enter one outcome per line" 
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1.5">Enter one outcome per line</p>
            </div>
          </div>
        </section>

        {/* Job Opportunities & Career Roles */}
        <section className="space-y-5">
          <div className="pb-2">
            <h3 className="text-xl font-semibold text-gray-900 mb-1.5">Job Opportunities & Career Roles</h3>
            <p className="text-sm text-gray-500">Provide information about job opportunities and career paths</p>
          </div>
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Job Opportunities Description</label>
              <Textarea 
                rows={4} 
                value={jobOpportunitiesDescription} 
                onChange={(e) => setJobOpportunitiesDescription(e.target.value)} 
                placeholder="Describe the job opportunities available to graduates of this course..." 
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5 pt-6 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700">Job Opportunities Callout</label>
              <Textarea 
                rows={3} 
                value={jobOpportunitiesCallout} 
                onChange={(e) => setJobOpportunitiesCallout(e.target.value)} 
                placeholder="Enter a highlighted callout or key message about job opportunities..." 
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5 pt-6 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700">Job Roles</label>
              <Textarea 
                rows={6} 
                value={jobRoles} 
                onChange={(e) => setJobRoles(e.target.value)} 
                placeholder="Format: Title|Description (one role per line)" 
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1.5">Format: Title|Description (one role per line)</p>
            </div>
          </div>
        </section>

        {/* Delivery & Schedule */}
        <section className="space-y-5">
          <div className="pb-2">
            <h3 className="text-xl font-semibold text-gray-900 mb-1.5">Delivery & Schedule</h3>
            <p className="text-sm text-gray-500">Configure how and when the course is delivered</p>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Modality</label>
              <Select value={modality} onChange={(e) => setModality(e.target.value)} disabled={loading}>
                <option>On-campus</option>
                <option>Online</option>
                <option>Hybrid</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Weeks</label>
              <Input type="number" min="0" value={weeks} onChange={(e) => setWeeks(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Hours</label>
              <Input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Credits</label>
              <Input type="number" min="0" value={credits} onChange={(e) => setCredits(e.target.value)} disabled={loading} />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5 pt-6 border-t border-gray-100">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Start date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">End date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Application deadline</label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={loading} />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5 pt-6 border-t border-gray-100">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Pace</label>
              <Input type="number" min="0" max="100" value={pace} onChange={(e) => setPace(e.target.value)} placeholder="%" disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Time of day</label>
              <Select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} disabled={loading}>
                <option value="day">Day</option>
                <option value="evening">Evening</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 mb-3">Options</label>
              <div className="flex flex-wrap gap-3">
                <Switch label="Online" checked={online} onChange={setOnline} disabled={loading} />
                <Switch label="Hybrid" checked={hybrid} onChange={setHybrid} disabled={loading} />
                <Switch label="Flexible" checked={flexible} onChange={setFlexible} disabled={loading} />
                <Switch label="Distance learning" checked={distanceLearning} onChange={setDistanceLearning} disabled={loading} />
                <Switch label="Full-time" checked={durationFullTime} onChange={setDurationFullTime} disabled={loading} />
              </div>
            </div>
          </div>
        </section>

        {/* Provider & Location */}
        <section className="space-y-5">
          <div className="pb-2">
            <h3 className="text-xl font-semibold text-gray-900 mb-1.5">Provider & Location</h3>
            <p className="text-sm text-gray-500">Information about the course provider and location</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Provider name</label>
              <Input value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="e.g., University Name" disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Provider type</label>
              <Select value={providerType} onChange={(e) => setProviderType(e.target.value)} disabled={loading}>
                <option value="university">University</option>
                <option value="polytechnic">Polytechnic</option>
                <option value="training_center">Training center</option>
                <option value="private">Private</option>
                <option value="public">Public</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Website</label>
              <Input value={providerWebsite} onChange={(e) => setProviderWebsite(e.target.value)} placeholder="https://" disabled={loading} />
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-5 pt-6 border-t border-gray-100">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Municipality</label>
              <Input value={municipality} onChange={(e) => setMunicipality(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">County</label>
              <Input value={county} onChange={(e) => setCounty(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Region</label>
              <Input value={region} onChange={(e) => setRegion(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" disabled={loading} />
            </div>
          </div>
          <div className="space-y-1.5 pt-6 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700">Accreditation</label>
            <Textarea rows={2} value={providerAccreditation} onChange={(e) => setProviderAccreditation(e.target.value)} placeholder="Separate with commas" disabled={loading} />
          </div>
        </section>

        {/* Cost & Availability */}
        <section className="space-y-5">
          <div className="pb-2">
            <h3 className="text-xl font-semibold text-gray-900 mb-1.5">Cost & Availability</h3>
            <p className="text-sm text-gray-500">Set pricing and availability options</p>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Tuition</label>
              <Input type="number" min="0" value={tuition} onChange={(e) => setTuition(e.target.value)} disabled={isFree || loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="SEK" disabled={isFree || loading} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 mb-3">Options</label>
              <div className="flex flex-wrap gap-3">
                <Switch label="Free" checked={isFree} onChange={setIsFree} disabled={loading} />
                <Switch label="Scholarship" checked={scholarship} onChange={setScholarship} disabled={loading} />
                <Switch label="Student aid available" checked={studentAid} onChange={setStudentAid} disabled={loading} />
              </div>
            </div>
          </div>
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <div className="pb-1">
              <h4 className="text-lg font-semibold text-gray-900 mb-1">Financing and Support</h4>
              <p className="text-sm text-gray-500">Select financing and support options available for this course</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Switch label="Education is free of charge" checked={financingFree} onChange={setFinancingFree} disabled={loading} />
              <Switch label="Qualifies for student aid (CSN)" checked={financingStudentAid} onChange={setFinancingStudentAid} disabled={loading} />
              <Switch label="Qualifies for transitional study support (CSN)" checked={financingTransitionalSupport} onChange={setFinancingTransitionalSupport} disabled={loading} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-5 pt-6 border-t border-gray-100">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} disabled={loading}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="draft">Draft</option>
              </Select>
            </div>
          </div>
        </section>

        {/* Requirements & Structure */}
        <section className="space-y-5">
          <div className="pb-2">
            <h3 className="text-xl font-semibold text-gray-900 mb-1.5">Requirements & Structure</h3>
            <p className="text-sm text-gray-500">Define prerequisites and course structure</p>
          </div>
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Requirements</label>
              <Textarea rows={4} value={requirementsText} onChange={(e) => setRequirementsText(e.target.value)} placeholder="Enter detailed requirements for applicants..." disabled={loading} />
            </div>
            <div className="space-y-1.5 pt-6 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700">Requirements Link</label>
              <Input value={fullRequirementsLink} onChange={(e) => setFullRequirementsLink(e.target.value)} placeholder="https://example.com/requirements" disabled={loading} />
            </div>
            <div className="space-y-1.5 pt-6 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700">Course Structure</label>
              <Textarea rows={4} value={courseStructureDetails} onChange={(e) => setCourseStructureDetails(e.target.value)} placeholder="Describe the course structure, modules, curriculum, and learning path..." disabled={loading} />
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="space-y-5">
          <div className="pb-2">
            <h3 className="text-xl font-semibold text-gray-900 mb-1.5">Contact Information</h3>
            <p className="text-sm text-gray-500">Contact details for course inquiries</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Contact email</label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@example.com" disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Contact phone</label>
              <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+46 123 456 789" disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Contact website</label>
              <Input value={contactWebsite} onChange={(e) => setContactWebsite(e.target.value)} placeholder="https://" disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Contact address</label>
              <Input value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} placeholder="Street address" disabled={loading} />
            </div>
          </div>
        </section>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-8 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className={programId ? 'bg-slate-900 hover:bg-slate-800' : ''}
              >
                {loading 
                  ? (programId ? 'Updating...' : 'Registering...') 
                  : (programId ? 'Update Program' : 'Register Course')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

