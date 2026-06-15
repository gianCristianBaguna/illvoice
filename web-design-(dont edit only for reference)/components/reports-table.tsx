'use client'

interface Report {
  id: string
  type: string
  severity: 'HIGH' | 'MODERATE' | 'LOW'
  status: 'RESOLVED' | 'IN PROGRESS' | 'URGENT'
}

const reports: Report[] = [
  { id: 'ILL-2026-001', type: 'Pothole', severity: 'MODERATE', status: 'RESOLVED' },
  { id: 'ILL-2026-002', type: 'Broken Streetlight', severity: 'LOW', status: 'IN PROGRESS' },
  { id: 'ILL-2026-003', type: 'Garbage Dumping', severity: 'MODERATE', status: 'IN PROGRESS' },
  { id: 'ILL-2026-004', type: 'Noise Complaint', severity: 'LOW', status: 'IN PROGRESS' },
  { id: 'ILL-2026-005', type: 'Fire Hazard', severity: 'HIGH', status: 'URGENT' },
  { id: 'ILL-2026-006', type: 'Flooding', severity: 'HIGH', status: 'URGENT' },
]

const severityColors = {
  HIGH: 'bg-red-100 text-red-700',
  MODERATE: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700',
}

const statusColors = {
  RESOLVED: 'bg-green-100 text-green-700',
  'IN PROGRESS': 'bg-yellow-100 text-yellow-700',
  URGENT: 'bg-red-100 text-red-700',
}

export function ReportsTable() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Recent Reports</h3>
          <a href="#" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            View All
          </a>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">TYPE</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">SEVERITY</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report, index) => (
              <tr key={report.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-6 py-3 text-sm text-blue-600 font-medium">{report.id}</td>
                <td className="px-6 py-3 text-sm text-slate-900">{report.type}</td>
                <td className="px-6 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${severityColors[report.severity]}`}>
                    {report.severity}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[report.status]}`}>
                    {report.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
