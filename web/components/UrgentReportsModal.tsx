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
import { fetchUrgentAlerts, AlertItem } from '@/lib/api';
import { Complaint } from '@/lib/mockData';

interface UrgentReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewReport: (complaint: Complaint) => void;
}

export function UrgentReportsModal({ isOpen, onClose, onViewReport }: UrgentReportsModalProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadAlerts = async () => {
      try {
        const data = await fetchUrgentAlerts();
        setAlerts(data);
      } catch (err) {
        console.error('Failed to fetch urgent alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[80vh] overflow-y-auto bg-white text-slate-900 p-0 sm:rounded-xl">
        <div className="p-6 border-b border-slate-200">
          <DialogHeader className="flex flex-row items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-950">
                Urgent Reports
              </DialogTitle>
              <DialogDescription className="text-slate-500 mt-1">
                High priority reports requiring immediate attention
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-500">Loading urgent reports...</div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-500">No urgent reports at this time.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {alert.title || `Report #${alert.id}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {alert.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
                        HIGH
                      </span>
                      {alert.barangay && (
                        <span className="text-xs text-slate-500">{alert.barangay}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewReport({
                      id: alert.id,
                      title: alert.title || `Report #${alert.id}`,
                      description: alert.description,
                      severity: 'HIGH',
                      status: 'OPEN',
                      reportedDate: new Date().toISOString(),
                      category: '',
                      userEmail: '',
                      userName: '',
                    } as Complaint)}
                    className="ml-4 border-slate-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all"
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
