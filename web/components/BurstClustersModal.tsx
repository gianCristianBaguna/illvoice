'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fetchBurstClusters, type BurstClusterItem } from '@/lib/api';
import { MapPin, Users } from 'lucide-react';

interface BurstClustersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewReport?: (reportId: string) => void;
}

export function BurstClustersModal({ isOpen, onClose, onViewReport }: BurstClustersModalProps) {
  const [clusters, setClusters] = useState<BurstClusterItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadClusters = async () => {
      try {
        const data = await fetchBurstClusters();
        setClusters(data);
      } catch (err) {
        console.error('Failed to fetch burst clusters:', err);
      } finally {
        setLoading(false);
      }
    };

    loadClusters();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[calc(100%-2rem)] max-h-[80vh] overflow-y-auto bg-white text-slate-900 p-0 sm:rounded-xl">
        <div className="p-6 border-b border-slate-200">
          <DialogHeader className="flex flex-row items-start justify-between">
             <div>
               <DialogTitle className="text-xl font-bold text-slate-950">
                 Possible cluster reports in the same location! Needs attention
               </DialogTitle>
               <DialogDescription className="text-slate-500 mt-1">
                 Multiple similar reports submitted within 10 minutes in the same area
               </DialogDescription>
             </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-500">Loading burst clusters...</div>
            </div>
          ) : clusters.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-500">No burst clusters detected at this time.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {clusters.map((cluster) => (
                <div
                  key={cluster.id}
                  className={`rounded-xl border p-4 ${
                    cluster.isUrgent
                      ? 'border-red-200 bg-red-50'
                      : 'border-yellow-200 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{cluster.theme}</span>
                        {cluster.isUrgent && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
                            Urgent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {cluster.barangay}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {cluster.reportCount} report{cluster.reportCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 shrink-0">
                      {new Date(cluster.latestReportAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {cluster.reports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => onViewReport?.(report.id)}
                        className="w-full flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 text-left hover:bg-white transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-700 truncate">{report.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">{report.description}</p>
                        </div>
                         <span
                           className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                             report.severity === 'HIGH'
                               ? 'bg-red-100 text-red-700'
                               : report.severity === 'MODERATE'
                                 ? 'bg-yellow-100 text-yellow-700'
                                 : 'bg-emerald-100 text-emerald-700'
                           }`}
                         >
                          {report.severity}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
