'use client'

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { fetchBurstClusters, type BurstClusterItem } from '@/lib/api'

export interface AlertBannerProps {
  onViewBurst?: () => void;
}

export function AlertBanner({ onViewBurst }: AlertBannerProps = {}) {
  const [burstClusters, setBurstClusters] = useState<BurstClusterItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const burst = await fetchBurstClusters();
        setBurstClusters(burst);
      } catch (err) {
        console.error('Failed to fetch burst clusters:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();

    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const hasBurst = burstClusters.length > 0;
  const burstBarangays = [...new Set(burstClusters.map(c => c.barangay).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-between gap-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
        <div className="flex items-center gap-3">
          <Users size={20} className="text-yellow-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-yellow-900 text-sm">Loading burst clusters...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
      <div className="flex items-center gap-3">
        <Users size={20} className="text-yellow-600 flex-shrink-0" />
        <div>
          {hasBurst ? (
            <>
              <p className="font-semibold text-yellow-900 text-sm">
                Possible cluster reports in the same location! Needs attention
              </p>
              <p className="text-yellow-700 text-xs">
                {burstClusters.length} similar report cluster{burstClusters.length !== 1 ? 's' : ''} detected in the last 10 minutes · {burstBarangays.join(', ')}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-yellow-900 text-sm">
                No burst clusters detected right now
              </p>
              <p className="text-yellow-700 text-xs">
                Monitoring for similar reports in the same area
              </p>
            </>
          )}
        </div>
      </div>
      {hasBurst && onViewBurst && (
        <button
          onClick={onViewBurst}
          className="px-4 py-1.5 bg-yellow-600 text-white text-xs font-semibold rounded hover:bg-yellow-700 whitespace-nowrap flex-shrink-0"
        >
          View Clusters
        </button>
      )}
    </div>
  )
}
