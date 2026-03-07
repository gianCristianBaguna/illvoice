export type SeverityLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'PENDING';
// 'PENDING' is the value stored in the database; we usually map it to OPEN on the
// client but the union includes it to avoid type errors if it leaks through.

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
}

const teamMembers = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'Alex Brown'];

export const mockComplaints: Complaint[] = [
  {
    id: '1',
    title: 'App crashes on login',
    description: 'The application crashes whenever I try to log in with my credentials',
    severity: 'HIGH',
    status: 'IN_PROGRESS',
    reportedDate: '2025-03-05T10:30:00Z',
    assignedTo: 'John Doe',
    deadline: '2025-03-07T18:00:00Z',
    resolutionNotes: 'Investigating authentication service logs',
    category: 'Technical Issue',
    userEmail: 'user1@example.com',
    userName: 'Alex Thompson',
  },
  {
    id: '2',
    title: 'Payment gateway timeout',
    description: 'Transactions are timing out during checkout process',
    severity: 'HIGH',
    status: 'OPEN',
    reportedDate: '2025-03-04T14:15:00Z',
    category: 'Payment',
    userEmail: 'user2@example.com',
    userName: 'Maria Garcia',
  },
  {
    id: '3',
    title: 'UI elements misaligned on tablet',
    description: 'Dashboard layout is broken when viewed on tablet devices',
    severity: 'MODERATE',
    status: 'IN_PROGRESS',
    reportedDate: '2025-03-03T09:45:00Z',
    assignedTo: 'Jane Smith',
    deadline: '2025-03-08T17:00:00Z',
    resolutionNotes: 'Testing responsive design fixes',
    category: 'UI/UX',
    userEmail: 'user3@example.com',
    userName: 'David Lee',
  },
  {
    id: '4',
    title: 'Slow data loading',
    description: 'Reports page takes more than 30 seconds to load',
    severity: 'MODERATE',
    status: 'OPEN',
    reportedDate: '2025-03-02T16:20:00Z',
    category: 'Performance',
    userEmail: 'user4@example.com',
    userName: 'Emma Wilson',
  },
  {
    id: '5',
    title: 'Typo in user profile section',
    description: 'There is a spelling error in the profile description field label',
    severity: 'LOW',
    status: 'RESOLVED',
    reportedDate: '2025-03-01T11:00:00Z',
    assignedTo: 'Mike Johnson',
    resolutionNotes: 'Fixed typo in profile.tsx component',
    category: 'Bug',
    userEmail: 'user5@example.com',
    userName: 'Chris Martinez',
  },
  {
    id: '6',
    title: 'Export to PDF not working',
    description: 'The export PDF button on reports page is not functioning',
    severity: 'MODERATE',
    status: 'OPEN',
    reportedDate: '2025-03-05T08:30:00Z',
    category: 'Feature Request',
    userEmail: 'user6@example.com',
    userName: 'Lisa Anderson',
  },
  {
    id: '7',
    title: 'Dark mode toggle not persisting',
    description: 'Dark mode selection is not saved across sessions',
    severity: 'LOW',
    status: 'OPEN',
    reportedDate: '2025-03-04T13:25:00Z',
    category: 'Bug',
    userEmail: 'user7@example.com',
    userName: 'Robert Taylor',
  },
  {
    id: '8',
    title: 'API rate limiting issue',
    description: 'Getting rate limited even with valid API key',
    severity: 'HIGH',
    status: 'RESOLVED',
    reportedDate: '2025-02-28T15:10:00Z',
    assignedTo: 'Sarah Williams',
    resolutionNotes: 'Updated rate limiting configuration for user',
    category: 'Technical Issue',
    userEmail: 'user8@example.com',
    userName: 'Jessica White',
  },
  {
    id: '9',
    title: 'Notification emails not sending',
    description: 'Users are not receiving notification emails for status updates',
    severity: 'MODERATE',
    status: 'IN_PROGRESS',
    reportedDate: '2025-03-03T12:40:00Z',
    assignedTo: 'Alex Brown',
    deadline: '2025-03-06T18:00:00Z',
    resolutionNotes: 'Checking email service provider logs',
    category: 'Technical Issue',
    userEmail: 'user9@example.com',
    userName: 'Michael Chen',
  },
  {
    id: '10',
    title: 'Missing language support',
    description: 'Spanish language option is not appearing in settings',
    severity: 'LOW',
    status: 'OPEN',
    reportedDate: '2025-03-05T07:15:00Z',
    category: 'Feature Request',
    userEmail: 'user10@example.com',
    userName: 'Sofia Rodriguez',
  },
  {
    id: '11',
    title: 'Search not returning results',
    description: 'Global search feature returns no results for valid queries',
    severity: 'HIGH',
    status: 'OPEN',
    reportedDate: '2025-03-05T09:00:00Z',
    category: 'Bug',
    userEmail: 'user11@example.com',
    userName: 'John Martin',
  },
  {
    id: '12',
    title: 'Mobile app force closes',
    description: 'App crashes when navigating to reports section',
    severity: 'HIGH',
    status: 'IN_PROGRESS',
    reportedDate: '2025-03-04T11:30:00Z',
    assignedTo: 'Jane Smith',
    deadline: '2025-03-07T12:00:00Z',
    resolutionNotes: 'Debugging memory leak in reports module',
    category: 'Technical Issue',
    userEmail: 'user12@example.com',
    userName: 'Laura Johnson',
  },
];

// Utility helper that works on any array of complaints.  
// If you don't pass data it will fall back to the original mock list, which
// keeps the existing samples working during development.
export function getComplaintStats(data: Complaint[] = mockComplaints) {
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
  
  // Calculate average resolution time using a 3‑day mock for resolved items.
  const resolvedComplaints = data.filter(c => c.status === 'RESOLVED');
  const avgResolutionTime = resolvedComplaints.length > 0 
    ? Math.round(resolvedComplaints.reduce((sum, c) => {
        const reported = new Date(c.reportedDate).getTime();
        const resolved = new Date(c.reportedDate).getTime() + (3 * 24 * 60 * 60 * 1000); // Mock: 3 days
        return sum + (resolved - reported);
      }, 0) / resolvedComplaints.length / (1000 * 60 * 60)) 
    : 0;

  return { total, byStatus, bySeverity, resolutionRate, avgResolutionTime };
}

export function getComplaintsTrend(data: Complaint[] = mockComplaints) {
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

export const teamMemberList = teamMembers;
