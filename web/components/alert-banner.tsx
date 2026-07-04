'use client'

import { AlertTriangle, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchUrgentAlerts, AlertItem } from '@/lib/api'

export interface AlertBannerProps {
  onViewUrgent?: () => void;
}

export function AlertBanner({ onViewUrgent }: AlertBannerProps = {}) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const urgentAlerts = await fetchUrgentAlerts();
        setAlerts(urgentAlerts);
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
    
    // Refresh alerts every 30 seconds for real-time updates
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const highSeverityCount = alerts.length;
  
  if (loading) {
    return (
      <div className="flex items-center justify-between gap-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900 text-sm">Loading alerts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (highSeverityCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-900 text-sm">
            HIGH PRIORITY: {highSeverityCount} critical report{highSeverityCount !== 1 ? 's' : ''} require{highSeverityCount === 1 ? 's' : ''} immediate attention
          </p>
          <p className="text-red-700 text-xs">
            {alerts.map(a => a.barangay).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')}
          </p>
        </div>
      </div>
      <button 
        onClick={onViewUrgent}
        className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 whitespace-nowrap flex-shrink-0"
      >
        View Urgent
      </button>
    </div>
  )
}