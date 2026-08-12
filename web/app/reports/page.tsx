'use client';

import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ViewReportModal } from '@/components/ViewReportModal';
import { useAuth } from '@/contexts/auth-context';
import { fetchComplaints } from '@/lib/api';
import { Complaint, ComplaintStatus } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

function getStatusLabel(status: ComplaintStatus) {
  switch (status) {
    case 'OPEN':
      return 'Open';
    case 'PENDING':
      return 'Pending';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'RESOLVED':
      return 'Resolved';
    default:
      return status;
  }
}

function getStatusColor(status: ComplaintStatus) {
  switch (status) {
    case 'OPEN':
    case 'PENDING':
      return 'bg-red-50 text-red-700 ring-red-600/20';
    case 'IN_PROGRESS':
      return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
    case 'RESOLVED':
      return 'bg-green-50 text-green-700 ring-green-600/20';
    default:
      return 'bg-white text-slate-700 ring-slate-600/20';
  }
}

function getSeverityColor(severity: Complaint['severity']) {
  switch (severity) {
    case 'HIGH':
      return 'bg-red-50 text-red-700 ring-red-600/20';
    case 'MODERATE':
      return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
    case 'LOW':
      return 'bg-green-50 text-green-700 ring-green-600/20';
    default:
      return 'bg-white text-slate-700 ring-slate-600/20';
  }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewReport, setViewReport] = useState<Complaint | null>(null);
  const { isAuthenticated, logout, adminRole, emailVerified } = useAuth();
  const router = useRouter();

  const loadReports = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const data = await fetchComplaints();
      setReports(data);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!emailVerified && adminRole !== 'ADMIN' && adminRole !== 'BARANGAY_OFFICIAL') {
      router.replace('/verify-email');
      return;
    }

    loadReports();

    const interval = setInterval(() => {
      loadReports();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, emailVerified, adminRole, loadReports, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleStatusSaved = (updatedReport: Complaint) => {
    setReports(prev => prev.map(report => report.id === updatedReport.id ? updatedReport : report));
    setViewReport(updatedReport);
  };

  const recentReports = [...reports]
    .sort((a, b) => new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime())
    .slice(0, 10);

  const pendingReports = reports.filter(report => report.status === 'OPEN' || report.status === 'PENDING').length;
  const inProgressIssues = reports.filter(report => report.status === 'IN_PROGRESS').length;
  const resolvedIssues = reports.filter(report => report.status === 'RESOLVED').length;

  if (!isAuthenticated || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-slate-600">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Sidebar />

      <div className="md:ml-48">
        <header className="border-b border-slate-200 bg-white">
          <div className="px-4 py-4 md:px-6 md:py-6">
            <div className="flex items-center justify-between">
              <div className="ml-10 md:ml-0">
                <h1 className="text-xl md:text-2xl font-bold text-slate-950">Reports</h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  Monitor complaints and update report status from one place
                </p>
              </div>
              <Button onClick={handleLogout} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <main className="px-3 py-4 md:px-6 md:py-6">
          <div className="max-w-7xl mx-auto space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Total Complaints</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{reports.length}</p>
                <p className="mt-1 text-xs text-slate-500">All submitted reports</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Pending Reports</p>
                <p className="mt-3 text-3xl font-bold text-red-600">{pendingReports}</p>
                <p className="mt-1 text-xs text-slate-500">Open and awaiting action</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">In Progress Issues</p>
                <p className="mt-3 text-3xl font-bold text-yellow-600">{inProgressIssues}</p>
                <p className="mt-1 text-xs text-slate-500">Currently being handled</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Resolved Issues</p>
                <p className="mt-3 text-3xl font-bold text-green-600">{resolvedIssues}</p>
                <p className="mt-1 text-xs text-slate-500">Completed reports</p>
              </div>
            </div>

             <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
               <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                 <div>
                   <h2 className="text-base font-semibold text-slate-950">Recent Reports</h2>
                   <p className="mt-1 text-sm text-slate-500">Latest complaints with quick view access</p>
                 </div>
                 <div className="flex items-center gap-3">
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={() => loadReports(true)}
                     disabled={refreshing}
                     className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                   >
                     <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                   </Button>
                   <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                     {recentReports.length} shown
                   </span>
                 </div>
               </div>

              <div className="overflow-x-auto scrollbar-light">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-5 py-3 text-slate-600">ID</TableHead>
                        <TableHead className="px-5 py-3 text-slate-600">Title</TableHead>
                        <TableHead className="px-5 py-3 text-slate-600">Severity</TableHead>
                        <TableHead className="px-5 py-3 text-slate-600">Status</TableHead>
                        <TableHead className="px-5 py-3 text-slate-600">Verified</TableHead>
                        <TableHead className="px-5 py-3 text-slate-600">Location</TableHead>
                        <TableHead className="px-5 py-3 text-slate-600">Reported</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                     {recentReports.length > 0 ? (
                       recentReports.map((report) => (
                         <TableRow
                           key={report.id}
                           onClick={() => setViewReport(report)}
                           className="cursor-pointer hover:bg-slate-50 transition-colors"
                         >
                           <TableCell className="px-5 py-4 font-medium text-blue-600">
                             #{report.id.slice(0, 8)}
                           </TableCell>
                           <TableCell className="px-5 py-4">
                             <div>
                               <p className="font-medium text-slate-950">{report.title}</p>
                               <p className="text-xs text-slate-500">{report.userName || 'Unknown user'}</p>
                             </div>
                           </TableCell>
                            <TableCell className="px-5 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getSeverityColor(report.severity)}`}>
                                {report.severity}
                              </span>
                              {report.isFlagged && (
                                <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                  FLAGGED
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="px-5 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusColor(report.status)}`}>
                                {getStatusLabel(report.status)}
                              </span>
                            </TableCell>
                            <TableCell className="px-5 py-4">
                              {report.userEmailVerified ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/20">
                                  Unverified
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-slate-600">
                              {report.address || report.barangay || 'Location not recorded'}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-slate-600">
                              {new Date(report.reportedDate).toLocaleDateString()}
                            </TableCell>
                         </TableRow>
                       ))
                     ) : (
                       <TableRow>
                          <TableCell colSpan={7} className="px-5 py-10 text-center text-slate-500">
                            No recent reports found.
                          </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </main>
      </div>

      <ViewReportModal
        complaint={viewReport}
        isOpen={!!viewReport}
        onClose={() => setViewReport(null)}
        onSave={handleStatusSaved}
      />
    </div>
  );
}
