export function getInterviewCalendarLinks(application, details) {
  const interviewDate = details?.interview_date ? new Date(details.interview_date) : null
  if (!interviewDate || Number.isNaN(interviewDate.getTime())) {
    return {
      google: '#',
      outlook: '#',
      download: () => {},
    }
  }

  const endDate = new Date(interviewDate.getTime() + 60 * 60 * 1000)
  const formatDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const title = encodeURIComponent(`Interview with ${application?.student_name || 'Applicant'}`)
  const detailsText = encodeURIComponent(
    `Program: ${application?.courses?.title || 'Program'}\nStatus: ${application?.status || 'pending'}`
  )
  const locationText = encodeURIComponent(details?.interview_location || 'TBD')
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatDate(
    interviewDate,
  )}/${formatDate(endDate)}&details=${detailsText}&location=${locationText}`
  const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${detailsText}&location=${locationText}&startdt=${interviewDate.toISOString()}&enddt=${endDate.toISOString()}`

  const download = () => {
    if (typeof document === 'undefined') return
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SchoolApp//Application Interview//EN',
      'BEGIN:VEVENT',
      `UID:${application?.id || (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now())}`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(interviewDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:Interview with ${application?.student_name || 'Applicant'}`,
      `DESCRIPTION:Interview for ${application?.courses?.title || 'program'}`,
      `LOCATION:${details?.interview_location || 'TBD'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `interview-${application?.id || 'event'}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return { google, outlook, download }
}


