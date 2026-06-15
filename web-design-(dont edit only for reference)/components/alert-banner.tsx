'use client'

import { AlertTriangle } from 'lucide-react'

export function AlertBanner() {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-900 text-sm">HIGH PRIORITY: 3 critical hazard reports require immediate attention</p>
          <p className="text-red-700 text-xs">Flooding, fire, and road damage reported in the last hour</p>
        </div>
      </div>
      <button className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 whitespace-nowrap flex-shrink-0">
        View Urgent
      </button>
    </div>
  )
}
