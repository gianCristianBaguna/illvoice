export type SeverityLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'PENDING';

export interface MediaFile {
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT';
  url: string;
  analysis?: Record<string, any>;
  id?: string;
}

export interface MapReportComplaint {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: ComplaintStatus;
  reportedDate: string;
  assignedTo?: string | null;
  deadline?: string | null;
  resolutionNotes?: string | null;
  remarks?: string | null;
  category: string;
  userEmail: string;
  userName: string;
  multimedia?: MediaFile[];
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  barangay?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  isCredible?: boolean;
  isFlagged?: boolean;
  flagType?: string | null;
  flagReason?: string | null;
  fraudCheck?: Record<string, any> | null;
  userEmailVerified?: boolean;
}

export type Complaint = MapReportComplaint;

export interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: 'RESIDENT' | 'BARANGAY_OFFICIAL' | 'ADMIN';
}

export function getComplaintStats(data: MapReportComplaint[]) {
  const total = data.length;
  const byStatus = {
    OPEN: data.filter(c => c.status === 'OPEN' || c.status === 'PENDING').length,
    IN_PROGRESS: data.filter(c => c.status === 'IN_PROGRESS').length,
    RESOLVED: data.filter(c => c.status === 'RESOLVED').length,
  };
  const bySeverity = {
    HIGH: data.filter(c => c.severity === 'HIGH').length,
    MODERATE: data.filter(c => c.severity === 'MODERATE').length,
    LOW: data.filter(c => c.severity === 'LOW').length,
  };

  const resolved = byStatus.RESOLVED;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const resolvedComplaints = data.filter(c => c.status === 'RESOLVED');
  const avgResolutionTime = resolvedComplaints.length > 0
    ? Math.round(resolvedComplaints.reduce((sum, c) => {
        const reported = new Date(c.reportedDate).getTime();
        const resolved = c.resolvedAt
          ? new Date(c.resolvedAt).getTime()
          : new Date(c.reportedDate).getTime() + (3 * 24 * 60 * 60 * 1000);
        return sum + (resolved - reported);
      }, 0) / resolvedComplaints.length / (1000 * 60 * 60))
    : 0;

  return { total, byStatus, bySeverity, resolutionRate, avgResolutionTime };
}

export function getComplaintsTrend(data: MapReportComplaint[]) {
  const days = 7;
  const trend: { date: string; complaints: number }[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const count = data.filter(c => {
      const cDate = new Date(c.reportedDate).toISOString().split('T')[0];
      return cDate === dateStr;
    }).length;

    trend.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      complaints: count,
    });
  }

  return trend;
}
