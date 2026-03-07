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

  // load real complaints from backend API
  useEffect(() => {
    fetchComplaints()
      .then(setComplaints)
      .catch((err) => {
        console.error('Error fetching reports:', err);
      });
  }, []);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">ILLVOICE Administrator</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track and resolve complaints from your mobile application
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                fetchComplaints()
                  .then(setComplaints)
                  .catch((err) => console.error('Error refreshing:', err));
              }}
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <section className="mb-8">
          <DashboardStats complaints={complaints} />
        </section>

        {/* Analytics Charts */}
        <section className="mb-8">
          <AnalyticsCharts complaints={complaints} />
        </section>

        {/* Complaints Table */}
        <section>
          <ComplaintsTable
            complaints={complaints}
            onComplaintClick={handleComplaintClick}
            onComplaintsUpdate={setComplaints}
          />
        </section>
      </main>

      {/* Resolution Modal */}
      <ResolutionModal
        complaint={selectedComplaint}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveComplaint}
      />
    </div>
  );
}
