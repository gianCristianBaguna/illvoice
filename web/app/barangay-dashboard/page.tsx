'use client';

import { ComplaintsTable } from '@/components/ComplaintsTable';
import { UrgentReportsModal } from '@/components/UrgentReportsModal';
import { ViewReportModal } from '@/components/ViewReportModal';
import { ActivityFeed } from '@/components/activity-feed';
import { AlertBanner } from '@/components/alert-banner';
import { ComplaintsByHazardChart, ComplaintsByMonthChart, ResolutionRateChart } from '@/components/dashboard-charts';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { BurstClustersModal } from '@/components/BurstClustersModal';
import { useAuth } from '@/contexts/auth-context';
import { fetchBarangayInfo, fetchComplaints, fetchComplaintById } from '@/lib/api';
import { Complaint } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function BarangayDashboardPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewComplaint, setViewComplaint] = useState<Complaint | null>(null);
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [showBurstModal, setShowBurstModal] = useState(false);
  const [barangayName, setBarangayName] = useState<string | null>(null);
  const { isAuthenticated, logout, barangayId, adminRole, emailVerified } = useAuth();
  const router = useRouter();

  const fetchDashboardData = useCallback(async () => {
    try {
      const data = await fetchComplaints();
      setComplaints(data);

      if (barangayId) {
        const barangay = await fetchBarangayInfo(barangayId);
        if (barangay) {
          setBarangayName(barangay.name);
        }
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [barangayId]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!emailVerified && adminRole !== 'ADMIN' && adminRole !== 'BARANGAY_OFFICIAL') {
      router.replace('/verify-email');
      return;
    }

    if (adminRole === 'ADMIN') {
      router.replace('/dashboard');
      return;
    }

    fetchDashboardData();
  }, [isAuthenticated, emailVerified, adminRole, fetchDashboardData, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleViewComplaint = (complaint: Complaint) => {
    setViewComplaint(complaint);
  };

  const handleComplaintsUpdate = (updatedComplaint: Complaint) => {
    setComplaints((prev) => prev.map((report) => (report.id === updatedComplaint.id ? updatedComplaint : report)));
    setViewComplaint(updatedComplaint);
  };

  const handleViewUrgent = () => {
    setShowUrgentModal(true);
  };

  const handleViewBurst = () => {
    setShowBurstModal(true);
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <div className="md:ml-48">
        <header className="border-b border-slate-200 bg-white">
          <div className="px-4 py-4 md:px-6 md:py-6">
            <div className="flex items-center justify-between">
              <div className="ml-10 md:ml-0">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                  {barangayName ? `${barangayName} Dashboard` : 'Barangay Dashboard'}
                </h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  Manage reports for your barangay
                </p>
              </div>
              <Button onClick={handleLogout} size="sm" className="hidden sm:inline-flex bg-red-600 hover:bg-red-700 text-white">
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <main className="px-3 py-4 md:px-6 md:py-6">
          <div className="max-w-7xl mx-auto space-y-6">

            <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Total Reports</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{complaints.length}</p>
                <p className="text-xs text-slate-500 mt-1">In your barangay</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Pending</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {complaints.filter((c) => c.status === 'OPEN' || c.status === 'PENDING').length}
                </p>
                <p className="text-xs text-slate-500 mt-1">Awaiting action</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Resolved</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {complaints.filter((c) => c.status === 'RESOLVED').length}
                </p>
                <p className="text-xs text-slate-500 mt-1">Completed reports</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Barangay Tools</p>
                <p className="mt-2 text-sm text-slate-600">
                  Open your barangay reports or view the map for your assigned area.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Link href="/reports" className="w-full sm:w-auto">
                    <Button className="w-full">View Barangay Reports</Button>
                  </Link>
                  <Link href="/map" className="w-full sm:w-auto">
                    <Button variant="secondary" className="w-full">Open Barangay Map</Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <AlertBanner onViewBurst={handleViewBurst} />
                <ComplaintsTable
                  complaints={complaints}
                  onViewComplaint={handleViewComplaint}
                  onComplaintsUpdate={handleComplaintsUpdate}
                />
                <div className="rounded-3xl border border-red-300 bg-red-50 p-6 shadow-sm">
                  <div className="flex items-center gap-3 text-red-900">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white">
                      !
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Urgent high severity alerts</p>
                      <p className="text-xs text-red-700">High priority reports are shown here first to support faster response.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <ActivityFeed />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
              <ComplaintsByHazardChart complaints={complaints} />
              <ComplaintsByMonthChart complaints={complaints} />
              <ResolutionRateChart complaints={complaints} />
            </div>
          </div>
        </main>
      </div>

      <ViewReportModal
        complaint={viewComplaint}
        isOpen={!!viewComplaint}
        onClose={() => setViewComplaint(null)}
        onSave={handleComplaintsUpdate}
      />

      <UrgentReportsModal
        isOpen={showUrgentModal}
        onClose={() => setShowUrgentModal(false)}
        onViewReport={setViewComplaint}
      />

      <BurstClustersModal
        isOpen={showBurstModal}
        onClose={() => setShowBurstModal(false)}
        onViewReport={async (reportId) => {
          const report = complaints.find(c => c.id === reportId);
          if (report) {
            setViewComplaint(report);
          } else {
            const fetched = await fetchComplaintById(reportId);
            if (fetched) {
              setViewComplaint(fetched);
            }
          }
        }}
      />
    </div>
  );
}
