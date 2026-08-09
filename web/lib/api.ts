import { Complaint, TeamMember } from './types';

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://illvoice-production.up.railway.app';

export async function getAdminToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const tokenFromCookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('adminToken='))
    ?.split('=')[1] || null;

  return tokenFromCookie || window.localStorage.getItem('adminToken') || null;
}

const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAdminToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

function normalizeStatusForBackend(status: Complaint['status']) {
  return status === 'OPEN' ? 'PENDING' : status;
}

function mapReportToComplaint(r: any): Complaint {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    severity: r.severity as Complaint['severity'],
    status: r.status === 'PENDING' ? ('OPEN' as Complaint['status']) : (r.status as Complaint['status']),
    reportedDate: r.createdAt,
    assignedTo: r.assignedTo || undefined,
    deadline: r.deadline || undefined,
    resolutionNotes: r.resolutionNotes || undefined,
    remarks: r.remarks || undefined,
    category: r.category || '',
    userEmail: r.user?.email || '',
    userName: r.user?.name || '',
    multimedia: r.multimedia?.map((m: any) => ({
      type: m.type,
      url: m.url,
      analysis: m.analysis,
      id: m.id,
    })) || [],
    latitude: r.latitude,
    longitude: r.longitude,
    address: r.address || null,
    barangay: r.barangay?.name || null,
    resolvedBy: r.resolvedBy?.name || null,
    resolvedAt: r.resolvedAt || null,
    isCredible: r.isCredible || false,
    isFlagged: r.isFlagged || false,
    flagType: r.flagType || null,
    flagReason: r.flagReason || null,
    fraudCheck: r.fraudCheck || null,
    userEmailVerified: r.user?.emailVerified ?? false,
  };
}

export async function fetchComplaints(): Promise<Complaint[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/reports`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch complaints: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('Unexpected response format from backend');
  }
  return data.map(mapReportToComplaint);
}

export async function fetchComplaintById(id: string): Promise<Complaint | null> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/reports/${id}`, { headers });
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  return mapReportToComplaint(data);
}

export async function fetchActivityFeed(): Promise<ActivityItem[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/reports/activity`, { headers });
  if (!res.ok) {
    return [];
  }
  return await res.json();
}

export async function fetchUrgentAlerts(): Promise<AlertItem[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/reports/urgent`, { headers });
  if (!res.ok) {
    return [];
  }
  return await res.json();
}

export interface ActivityItem {
  id: string;
  initials: string;
  color: string;
  senderName: string;
  title: string;
  time: string;
  date: string;
  timestamp: string;
  type: 'new_report' | 'assigned' | 'resolved' | 'status_update' | 'user_registered';
}

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: 'HIGH';
  barangay: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface BurstClusterItem {
  id: string;
  theme: string;
  barangay: string;
  barangayId: string | null;
  reportCount: number;
  reports: {
    id: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    createdAt: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    category: string | null;
    userId: string;
  }[];
  latestReportAt: string;
  isUrgent: boolean;
}

export async function fetchBurstClusters(timeWindowMinutes: number = 10, minClusterSize: number = 2): Promise<BurstClusterItem[]> {
  const headers = await authHeaders();
  const params = new URLSearchParams();
  params.set('timeWindow', String(timeWindowMinutes));
  params.set('minClusterSize', String(minClusterSize));
  const res = await fetch(`${BACKEND_URL}/api/reports/burst-clusters?${params.toString()}`, { headers });
  if (!res.ok) {
    return [];
  }
  return await res.json();
}

export async function updateComplaint(complaint: Complaint): Promise<Complaint> {
  const headers = await authHeaders();
  const payload: any = {};
  if (complaint.status) payload.status = normalizeStatusForBackend(complaint.status);
  if (complaint.severity) payload.severity = complaint.severity;
  if (complaint.resolvedBy !== undefined) payload.resolvedByName = complaint.resolvedBy;
  if (complaint.assignedTo !== undefined) payload.assignedTo = complaint.assignedTo;
  if (complaint.deadline !== undefined) payload.deadline = complaint.deadline;
  if (complaint.resolutionNotes !== undefined) payload.resolutionNotes = complaint.resolutionNotes;
  if (complaint.remarks !== undefined) payload.remarks = complaint.remarks;
  if (complaint.isCredible !== undefined) payload.isCredible = complaint.isCredible;
  if (complaint.category !== undefined) payload.category = complaint.category;

  const res = await fetch(`${BACKEND_URL}/api/reports/${complaint.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update complaint: ${res.status} ${text}`);
  }
  const data = await res.json();
  return mapReportToComplaint(data.report);
}

export async function updateComplaintStatus(complaintId: string, status: Complaint['status']): Promise<Complaint> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/reports/${complaintId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ status: normalizeStatusForBackend(status) }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update complaint status: ${res.status} ${text}`);
  }
  const data = await res.json();
  return mapReportToComplaint(data.report);
}

export async function resolveComplaint(complaintId: string, adminName: string): Promise<Complaint> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/reports/${complaintId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ resolvedByName: adminName }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to resolve complaint: ${res.status} ${text}`);
  }
  const data = await res.json();
  return mapReportToComplaint(data.report);
}

export async function analyzeComplaintWithAI(complaintId: string): Promise<{
  aiSeverity: string;
  insights: string;
  currentSeverity: string;
}> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/reports/${complaintId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to analyze complaint: ${res.status} ${text}`);
  }
  return await res.json();
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  phoneNumber: string | null;
  role: 'RESIDENT' | 'BARANGAY_OFFICIAL' | 'ADMIN';
  credibility: number;
  createdAt: string;
  reportCount: number;
  barangayId: string | null;
}

export async function fetchUsers(): Promise<User[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/admin/users`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch users: ${res.status} ${text}`);
  }
  return await res.json();
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/admin/users`, { headers });
  if (!res.ok) {
    throw new Error('Failed to fetch team members');
  }
  const users: User[] = await res.json();
  return users
    .filter(user => user.role !== 'RESIDENT')
    .map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }));
}

export interface BarangayInfo {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string | null;
}

export async function fetchBarangayInfo(barangayId: string): Promise<BarangayInfo | null> {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${BACKEND_URL}/api/admin/barangays/${barangayId}`, { headers });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

export interface BarangayAccount {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  boundaryPolygon?: any;
  officialCount?: number;
}

export async function fetchBarangayAccounts(): Promise<BarangayAccount[]> {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${BACKEND_URL}/api/admin/barangays`, { headers });
    if (!res.ok) {
      return [];
    }
    const barangays = await res.json();
    
    // Fetch official counts for each barangay
    const accountsWithCounts = await Promise.all(
      barangays.map(async (b: any) => {
        try {
          const offRes = await fetch(`${BACKEND_URL}/api/admin/barangays/${b.id}/officials`, { headers });
          const officials = offRes.ok ? await offRes.json() : [];
          return { ...b, officialCount: officials.length };
        } catch {
          return { ...b, officialCount: 0 };
        }
      })
    );
    
    return accountsWithCounts;
  } catch {
    return [];
  }
}

export async function createBarangayAccount(data: {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  boundaryPolygon?: any;
}): Promise<BarangayAccount> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/admin/barangays`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create barangay');
  }
  return await res.json();
}

export async function updateBarangayAccount(id: string, data: Partial<BarangayAccount>): Promise<BarangayAccount> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/admin/barangays/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update barangay');
  }
  return await res.json();
}

export async function deleteBarangayAccount(id: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/admin/barangays/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete barangay');
  }
}

export async function updateUserPassword(userId: string, password: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update password');
  }
}

export async function updateUserStatus(userId: string, active: boolean): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update user status');
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete user');
  }
}
