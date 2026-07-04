'use client';

import { ComplaintsByHazardChart, ComplaintsByMonthChart, ResolutionRateChart } from '@/components/dashboard-charts';
import { ComplaintsTable } from '@/components/ComplaintsTable';
import { AlertBanner } from '@/components/alert-banner';
import { ActivityFeed } from '@/components/activity-feed';
import { Sidebar } from '@/components/sidebar';
import { ViewReportModal } from '@/components/ViewReportModal';
import { UrgentReportsModal } from '@/components/UrgentReportsModal';
import { Button } from '@/components/ui/button';
import { fetchComplaints } from '@/lib/api';
import { Complaint } from '@/lib/mockData';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewComplaint, setViewComplaint] = useState<Complaint | null>(null);
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const { isAuthenticated, logout, adminEmail } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    fetchDashboardData();
  }, [isAuthenticated, router]);

  const fetchDashboardData = async () => {
    try {
      const data = await fetchComplaints();
      setComplaints(data);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleViewComplaint = (complaint: Complaint) => {
    setViewComplaint(complaint);
  };

  const handleViewUrgent = () => {
    setShowUrgentModal(true);
  };

  const handleComplaintsUpdate = (updatedComplaint: Complaint) => {
    setComplaints(prev => prev.map(c => 
      c.id === updatedComplaint.id ? updatedComplaint : c
    ));
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

      {/* Main Content */}
      <div className="md:ml-48">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white">
          <div className="px-4 py-4 md:px-6 md:py-6">
            <div className="flex items-center justify-between">
              <div className="ml-10 md:ml-0">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">ILLVoice Administrator</h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  Track and resolve complaints from your community
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleLogout} size="sm" className="hidden sm:inline-flex">
                  Sign Out
                </Button>
                <Button variant="destructive" onClick={handleLogout} size="sm" className="sm:hidden">
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-3 py-4 md:px-6 md:py-6">
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            {/* Alert Banner - Real-time from database */}
            <AlertBanner onViewUrgent={handleViewUrgent} />

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ComplaintsByHazardChart complaints={complaints} />
              <ComplaintsByMonthChart complaints={complaints} />
              <ResolutionRateChart complaints={complaints} />
            </div>

            {/* Complaints Table + Activity Feed */}
            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ComplaintsTable
                  complaints={complaints}
                  onComplaintsUpdate={handleComplaintsUpdate}
                  onViewComplaint={handleViewComplaint}
                />
              </div>
              <div>
                <ActivityFeed />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* View Report Modal */}
      <ViewReportModal
        complaint={viewComplaint}
        isOpen={!!viewComplaint}
        onClose={() => setViewComplaint(null)}
      />

      <UrgentReportsModal
        isOpen={showUrgentModal}
        onClose={() => setShowUrgentModal(false)}
        onViewReport={setViewComplaint}
      />
    </div>
  );
}