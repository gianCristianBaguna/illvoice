'use client';

import { AnalyticsCharts } from '@/components/AnalyticsCharts';
import { ComplaintsTable } from '@/components/ComplaintsTable';
import { DashboardStats } from '@/components/DashboardStats';
import { ResolutionModal } from '@/components/ResolutionModal';
import { Button } from '@/components/ui/button';
import { fetchComplaints } from '@/lib/api';
import { Complaint } from '@/lib/mockData';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Temporarily bypass login
  const isAuthenticated = true;

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  const handleComplaintClick = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsModalOpen(true);
  };

  const handleSaveComplaint = (updatedComplaint: Complaint) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === updatedComplaint.id ? updatedComplaint : c))
    );
    setIsModalOpen(false);
  };

  const handleLogout = () => {
    setComplaints([]);
    // Optional: If you want to restore login later
    // setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">ILLVOICE Administrator</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track and resolve complaints from your community
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchDashboardData}>
                🔄 Refresh Data
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8">
          <DashboardStats complaints={complaints} />
        </section>

        <section className="mb-8">
          <AnalyticsCharts complaints={complaints} />
        </section>

        <section>
          <ComplaintsTable
            complaints={complaints}
            onComplaintClick={handleComplaintClick}
            onComplaintsUpdate={setComplaints}
          />
        </section>
      </main>

      <ResolutionModal
        complaint={selectedComplaint}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveComplaint}
      />
    </div>
  );
}