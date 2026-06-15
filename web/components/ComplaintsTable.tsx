'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Complaint } from '@/lib/mockData';
import { useMemo, useState } from 'react';

interface ComplaintsTableProps {
  complaints: Complaint[];
  onComplaintClick: (complaint: Complaint) => void;
  onComplaintsUpdate: (updatedComplaint: Complaint) => void;
  onViewComplaint: (complaint: Complaint) => void;
}

type SortField = 'reportedDate' | 'severity' | 'status';
type SortOrder = 'asc' | 'desc';

export function ComplaintsTable({ 
  complaints: complaintsProp,
  onComplaintClick,
  onComplaintsUpdate,
  onViewComplaint,
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
        return 'bg-red-100 text-red-700';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-700';
      case 'LOW':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'PENDING':
        return 'bg-red-100 text-red-700';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-700';
      case 'RESOLVED':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
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
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Recent Reports</h3>
          <a href="#" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            View All
          </a>
        </div>
      </div>
      
      {/* Filters */}
      <div className="p-3 md:p-4 border-b border-slate-200 bg-slate-50">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium mb-1 md:mb-2 block">Search</label>
            <Input
              placeholder="Search by ID, title, user, or barangay..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 md:mb-2 block">Severity</label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="border-slate-300">
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
            <label className="text-sm font-medium mb-1 md:mb-2 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-slate-300">
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
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">TYPE</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">SEVERITY</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">STATUS</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">LOCATION</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length > 0 ? (
              filteredAndSorted.map((complaint, index) => (
                <tr key={complaint.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-6 py-3 text-sm text-blue-600 font-medium">#{complaint.id.slice(0, 8)}</td>
                  <td className="px-6 py-3 text-sm text-slate-900">{complaint.title}</td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(complaint.severity)}`}>
                      {complaint.severity}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(complaint.status)}`}>
                      {complaint.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {complaint.barangay || 'Unknown'}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewComplaint(complaint)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onComplaintClick(complaint)}
                      >
                        Resolve
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
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