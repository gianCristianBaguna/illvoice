import { Complaint } from './mockData';

// base url for the backend, override with NEXT_PUBLIC_BACKEND_URL in env
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://10.160.107.203:4000';

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
  };
}

export async function fetchComplaints(): Promise<Complaint[]> {
  const res = await fetch(`${BACKEND_URL}/api/reports`);
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

// send modifications to the backend so they persist
export async function updateComplaint(complaint: Complaint): Promise<Complaint> {
  const payload: any = {};
  if (complaint.status) payload.status = complaint.status;
  if (complaint.severity) payload.severity = complaint.severity;

  const res = await fetch(`${BACKEND_URL}/api/reports/${complaint.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
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

export async function analyzeComplaintWithAI(complaintId: string): Promise<{
  aiSeverity: string;
  insights: string;
  currentSeverity: string;
}> {
  const res = await fetch(`${BACKEND_URL}/api/reports/${complaintId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to analyze complaint: ${res.status} ${text}`);
  }
  return await res.json();
}
