export type SeverityLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'PENDING';
// 'PENDING' is the value stored in the database; we usually map it to OPEN on the
// client but the union includes it to avoid type errors if it leaks through.

export interface MediaFile {
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT';
  url: string;
  analysis?: Record<string, any>;
  id?: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: ComplaintStatus;
  reportedDate: string;
  assignedTo?: string;
  deadline?: string;
  resolutionNotes?: string;
  category: string;
  userEmail: string;
  userName: string;
  multimedia?: MediaFile[];
  latitude?: number | null;
  longitude?: number | null;
  barangay?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
}

// Team members are now fetched from the database
export function getTeamMembers(): string[] {
  // This will be dynamically populated from the backend
  return [];
}

const teamMembers = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'Alex Brown'];

export const teamMemberList = teamMembers;

// Utility helper that works on any array of complaints.
export function getComplaintStats(data: Complaint[]) {
  const total = data.length;
  const byStatus = {
    OPEN: data.filter(c => c.status === 'OPEN').length,
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
  
  // Calculate average resolution time using resolved items
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

export function getComplaintsTrend(data: Complaint[]) {
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