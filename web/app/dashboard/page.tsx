'use client';

import { ActivityFeed } from '@/components/activity-feed';
import { AlertBanner } from '@/components/alert-banner';
import { ComplaintsTable } from '@/components/ComplaintsTable';
import { ComplaintsByHazardChart, ComplaintsByMonthChart, ResolutionRateChart } from '@/components/dashboard-charts';
import { IssueClusters } from '@/components/IssueClusters';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UrgentReportsModal } from '@/components/UrgentReportsModal';
import { ViewReportModal } from '@/components/ViewReportModal';
import { BurstClustersModal } from '@/components/BurstClustersModal';
import { useAuth } from '@/contexts/auth-context';
import { fetchAnnouncements, fetchComplaints, fetchComplaintById } from '@/lib/api';
import type { Announcement } from '@/lib/api';
import { Complaint } from '@/lib/types';
import { Megaphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function DashboardPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewComplaint, setViewComplaint] = useState<Complaint | null>(null);
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [showBurstModal, setShowBurstModal] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const { isAuthenticated, logout, adminEmail, adminName, adminRole, emailVerified } = useAuth();
  const router = useRouter();

  const fetchDashboardData = useCallback(async () => {
    try {
      const [complaintsData, announcementsData] = await Promise.all([
        fetchComplaints(),
        fetchAnnouncements(),
      ])
      setComplaints(complaintsData)
      setAnnouncements(announcementsData)
    } catch (err) {
      console.error('Error fetching reports:', err)
    } finally {
      setLoading(false)
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

    fetchDashboardData();

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, emailVerified, adminRole, router, fetchDashboardData]);

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

  const handleViewBurst = () => {
    setShowBurstModal(true);
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
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">Welcome, {adminName || 'Admin'}</h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  Track and resolve complaints from your community
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleLogout} size="sm" className="hidden sm:inline-flex bg-red-600 hover:bg-red-700 text-white">
                  Sign Out
                </Button>
                <Button onClick={handleLogout} size="sm" className="sm:hidden bg-red-600 hover:bg-red-700 text-white">
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-3 py-4 md:px-6 md:py-6">
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ComplaintsByHazardChart complaints={complaints} />
              <ComplaintsByMonthChart complaints={complaints} />
              <ResolutionRateChart complaints={complaints} />
            </div>

            {/* Announcements */}
            {announcements.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-3 md:px-6 md:py-4">
                  <div className="flex items-center gap-2">
                    <Megaphone size={18} className="text-blue-600" />
                    <h2 className="text-sm font-semibold text-black">Announcements</h2>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {announcements.slice(0, 5).map((announcement) => (
                    <div key={announcement.id} className="px-4 py-3 md:px-6 md:py-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-black">{announcement.title}</h3>
                            {announcement.priority === 'URGENT' && (
                              <Badge className="bg-red-600 text-white hover:bg-red-700 text-xs">Urgent</Badge>
                            )}
                            {announcement.priority === 'HIGH' && (
                              <Badge className="bg-orange-500 text-white hover:bg-orange-600 text-xs">High</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{announcement.content}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(announcement.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Complaints Table + Urgent Feed + Activity Feed */}
            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ComplaintsTable
                  complaints={complaints}
                  onComplaintsUpdate={handleComplaintsUpdate}
                  onViewComplaint={handleViewComplaint}
                />
              </div>
              <div className="space-y-4">
                <AlertBanner onViewBurst={handleViewBurst} />
                <div className="rounded-3xl border border-red-300 bg-red-50 p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3 text-red-900">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white">
                        !
                      </span>
                      <div>
                        <p className="text-sm font-semibold">Urgent high severity alerts</p>
                        <p className="text-xs text-red-700">High priority reports are shown above live activity for faster response.</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewUrgent}
                      className="border-slate-300 hover:bg-red-100 hover:text-red-700"
                    >
                      View urgent
                    </Button>
                  </div>
                </div>
                <ActivityFeed />
              </div>
            </div>

            {/* Similar Issue Clusters (only groups with 2+ related reports) */}
            <IssueClusters complaints={complaints} minClusterSize={2} onViewComplaint={handleViewComplaint} />
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
