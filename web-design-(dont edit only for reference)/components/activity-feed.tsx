'use client'

interface Activity {
  id: string
  avatar: string
  initials: string
  color: string
  title: string
  time: string
}

const activities: Activity[] = [
  { id: '1', initials: 'JI', color: 'bg-red-600', title: 'New HIGH severity report - Fire Hazard, Brgy. Jaro', time: '9:30 AM' },
  { id: '2', initials: 'EC', color: 'bg-green-600', title: 'ILL 2024-001 marked as Resolved by Engr. Reyes', time: '9:30 AM' },
  { id: '3', initials: 'GB', color: 'bg-blue-600', title: 'ILL 2024-008 assigned to Engr. Reyes', time: '9:30 AM' },
  { id: '4', initials: 'FT', color: 'bg-red-600', title: 'New HIGH severity report - Flooding in Brgy. Jaro', time: '9:30 AM' },
  { id: '5', initials: 'CJ', color: 'bg-yellow-600', title: 'ILL 2024-004 status updated to In Progress', time: '9:30 AM' },
  { id: '6', initials: 'A', color: 'bg-slate-600', title: 'New user registered - Rosa Diaz, Brgy. Molo', time: '9:30 AM' },
]

export function ActivityFeed() {
  return (
    <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Live Activity</h3>
      </div>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-slate-200 last:border-0 last:pb-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${activity.color}`}>
              {activity.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900 leading-snug">{activity.title}</p>
            </div>
            <span className="text-xs text-slate-500 flex-shrink-0 whitespace-nowrap">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
