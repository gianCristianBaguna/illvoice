'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Complaint } from '@/lib/mockData';
import { useMemo, useState } from 'react';

interface ComplaintsTableProps {
  complaints: Complaint[];
  onViewComplaint: (complaint: Complaint) => void;
  onComplaintsUpdate: (updatedComplaint: Complaint) => void;
}

type SortField = 'reportedDate' | 'severity' | 'status';
type SortOrder = 'asc' | 'desc';

export function ComplaintsTable({ 
  complaints: complaintsProp,
  onViewComplaint,
  onComplaintsUpdate,
}: ComplaintsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('reportedDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const filteredAndSorted = useMemo(() => {
    let filtered = complaintsProp.filter((complaint) => {
      const matchesSearch =
        complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.id.includes(searchTerm) ||
        complaint.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (complaint.barangay && complaint.barangay.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSeverity = severityFilter === 'ALL' || complaint.severity === severityFilter;
      const matchesStatus = statusFilter === 'ALL' || complaint.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'reportedDate') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return sorted;
  }, [complaintsProp, searchTerm, severityFilter, statusFilter, sortField, sortOrder]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 text-red-700 ring-red-600/20';
      case 'MODERATE':
        return 'bg-amber-100 text-amber-700 ring-amber-600/20';
      case 'LOW':
        return 'bg-emerald-100 text-emerald-700 ring-emerald-600/20';
      default:
        return 'bg-white text-gray-700 ring-gray-600/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'PENDING':
        return 'bg-red-100 text-red-700 ring-red-600/20';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-700 ring-amber-600/20';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-700 ring-emerald-600/20';
      default:
        return 'bg-white text-gray-700 ring-gray-600/20';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
      <div className="p-5 md:p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Recent Reports</h3>
          <a href="/reports" className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
            View All
          </a>
        </div>
      </div>
      
      {/* Filters */}
      <div className="p-3 md:p-4 border-b border-slate-200 bg-white">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium mb-1 md:mb-2 block text-slate-700">Search</label>
            <Input
              placeholder="Search by ID, title, user, or barangay..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className=" focus:border-blue-500 focus:ring-blue-500/20 text-sm rounded-lg "
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 md:mb-2 block text-slate-700">Severity</label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="border-slate-300 focus:border-amber-500 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Severities</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MODERATE">Moderate</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 md:mb-2 block text-slate-700">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-slate-300 focus:border-emerald-500 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">TYPE</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-800" onClick={() => handleSort('severity')}>
                SEVERITY {sortField === 'severity' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-800" onClick={() => handleSort('status')}>
                STATUS {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">LOCATION</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length > 0 ? (
              filteredAndSorted.map((complaint, index) => (
                <tr key={complaint.id} className={index % 2 === 0 ? 'bg-white' : 'bg-white hover:bg-white transition-colors'}>
                  <td className="px-6 py-4 text-sm text-blue-600 font-medium">#{complaint.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">{complaint.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${getSeverityColor(complaint.severity)}`}>
                      {complaint.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${getStatusColor(complaint.status)}`}>
                      {complaint.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {complaint.barangay || 'Location not recorded'}
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewComplaint(complaint)}
                      className="border-slate-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all"
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No complaints found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}