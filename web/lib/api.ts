import { Complaint } from './mockData';

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function getAdminToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith('adminToken='))
    ?.split('=')[1] || null;
}

const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAdminToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

function mapReportToComplaint(r: any): Complaint {
  // convert the response shape from backend to UI shape
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    severity: r.severity as Complaint['severity'],
    // backend uses PENDING, convert to OPEN so the rest of the UI doesn't need
    // to worry about it.
    status: r.status === 'PENDING' ? ('OPEN' as Complaint['status']) : (r.status as Complaint['status']),
    reportedDate: r.createdAt,
    assignedTo: undefined,
    deadline: undefined,
    resolutionNotes: undefined,
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
    barangay: r.barangay?.name || null,
    resolvedBy: r.resolvedBy?.name || null,
    resolvedAt: r.resolvedAt || null,
  };
}

export async function fetchComplaints(): Promise<Complaint[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/reports`, {
    headers,
  });
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

// Fetch real-time activity feed from backend
export async function fetchActivityFeed(): Promise<ActivityItem[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/reports/activity`, {
    headers,
  });
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return data;
}

// Fetch urgent/high priority alerts
export async function fetchUrgentAlerts(): Promise<AlertItem[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/reports/urgent`, {
    headers,
  });
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return data;
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
  latitude: number | null;
  longitude: number | null;
}

// send modifications to the backend so they persist
export async function updateComplaint(complaint: Complaint): Promise<Complaint> {
  const headers = await authHeaders();
  const payload: any = {};
  if (complaint.status) payload.status = complaint.status;
  if (complaint.severity) payload.severity = complaint.severity;
  if (complaint.resolvedBy) payload.resolvedByName = complaint.resolvedBy;

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
  // backend returns { message, report }
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