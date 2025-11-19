'use client'

import { useState, useEffect } from 'react'

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    // Mock notifications - replace with actual data fetching
    setNotifications([
      {
        id: 1,
        type: 'info',
        message: '5 new applications received today',
        time: '2 hours ago',
      },
      {
        id: 2,
        type: 'warning',
        message: '3 applications pending review for more than 3 days',
        time: '5 hours ago',
      },
      {
        id: 3,
        type: 'success',
        message: '2 students enrolled this week',
        time: '1 day ago',
      },
    ])
  }, [])

  if (notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        No notifications
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-3 rounded-lg border ${
            notification.type === 'warning'
              ? 'bg-amber-50 border-amber-200'
              : notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <div className="text-sm font-medium text-gray-900">
            {notification.message}
          </div>
          <div className="text-xs text-gray-500 mt-1">{notification.time}</div>
        </div>
      ))}
    </div>
  )
}

