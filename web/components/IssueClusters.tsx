'use client';

import { useMemo, useState } from 'react';
import { Complaint } from '@/lib/mockData';
import { clusterComplaints, type IssueCluster } from '@/lib/clustering';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MODERATE: 'bg-amber-100 text-amber-700',
  LOW: 'bg-emerald-100 text-emerald-700',
};

const SEVERITY_DOT: Record<string, string> = {
  HIGH: 'bg-red-500',
  MODERATE: 'bg-amber-500',
  LOW: 'bg-emerald-500',
};

function formatDate(date: string) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ClusterCard({
  cluster,
  onViewComplaint,
}: {
  cluster: IssueCluster;
  onViewComplaint?: (c: Complaint) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const openCount = cluster.status.OPEN + cluster.status.PENDING + cluster.status.IN_PROGRESS;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">{cluster.theme}</span>
            {cluster.recurring && (
              <Badge variant="destructive" className="shrink-0">Recurring</Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{cluster.barangay}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-bold text-slate-800">
          {cluster.count}
          <span className="text-[10px] font-medium text-slate-500">{cluster.count === 1 ? 'report' : 'reports'}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(Object.keys(cluster.severity) as string[]).map((sev) =>
          cluster.severity[sev as keyof typeof cluster.severity] > 0 ? (
            <span
              key={sev}
              className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', SEVERITY_STYLES[sev])}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', SEVERITY_DOT[sev])} />
              {sev.charAt(0) + sev.slice(1).toLowerCase()}: {cluster.severity[sev as keyof typeof cluster.severity]}
            </span>
          ) : null
        )}
      </div>

      {cluster.keywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {cluster.keywords.map((kw) => (
            <span key={kw} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
              {kw}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
        <span>{openCount} open · {cluster.status.RESOLVED} resolved</span>
        <span>Latest {formatDate(cluster.latestDate)}</span>
      </div>

      {cluster.count > 1 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          {expanded ? 'Hide reports' : `View ${cluster.count} reports`}
        </button>
      )}

      {expanded && (
        <ul className="mt-2 space-y-1.5">
          {cluster.members.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => onViewComplaint?.(m)}
                className="w-full rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-left transition-colors hover:bg-slate-100"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-slate-700">{m.title}</span>
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', SEVERITY_DOT[m.severity])} />
                </div>
                <span className="text-[10px] text-slate-400">
                  {m.userName || m.userEmail} · {formatDate(m.reportedDate)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function IssueClusters({
  complaints,
  onViewComplaint,
}: {
  complaints: Complaint[];
  onViewComplaint?: (c: Complaint) => void;
}) {
  const clusters = useMemo(() => clusterComplaints(complaints), [complaints]);
  const recurringCount = clusters.filter((c) => c.recurring).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-indigo-100/50">
      <div className="flex items-center justify-between px-4 py-4 md:px-6 md:py-5">
        <div>
          <h3 className="text-xs md:text-sm font-semibold text-slate-800">Similar Issue Clusters</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Reports grouped by hazard theme and location
          </p>
        </div>
        <div className="flex gap-2 text-right">
          <div className="rounded-lg bg-slate-100 px-3 py-1.5">
            <div className="text-base font-bold text-slate-800">{clusters.length}</div>
            <div className="text-[10px] text-slate-500">clusters</div>
          </div>
          <div className="rounded-lg bg-red-50 px-3 py-1.5">
            <div className="text-base font-bold text-red-600">{recurringCount}</div>
            <div className="text-[10px] text-red-400">recurring</div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 md:px-6 md:pb-6">
        {clusters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
            No reports available to cluster.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {clusters.map((cluster) => (
              <ClusterCard key={cluster.id} cluster={cluster} onViewComplaint={onViewComplaint} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
