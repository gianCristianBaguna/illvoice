'use client'

import { useEffect, useState } from 'react'
import { fetchActivityFeed, ActivityItem } from '@/lib/api'

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const feedActivities = await fetchActivityFeed();
        setActivities(feedActivities);
      } catch (err) {
        console.error('Failed to fetch activity feed:', err);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
    
    // Refresh activities every 30 seconds for real-time updates
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Live Activity</h3>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Live Activity</h3>
      </div>
      <div className="space-y-3">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-slate-200 last:border-0 last:pb-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${activity.color}`}>
                {activity.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900 leading-snug">{activity.title}</p>
                {activity.senderName && (
                  <p className="text-xs text-slate-500 mt-0.5">by {activity.senderName}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs text-slate-500 block whitespace-nowrap">{activity.time}</span>
                {activity.date && (
                  <span className="text-[10px] text-slate-400 block whitespace-nowrap">{activity.date}</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No recent activity for today</p>
        )}
      </div>
    </div>
  )
}