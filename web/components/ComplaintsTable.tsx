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
  onComplaintClick: (complaint: Complaint) => void;
  complaints: Complaint[];
  onComplaintsUpdate: (complaints: Complaint[]) => void;
}

type SortField = 'reportedDate' | 'severity' | 'status';
type SortOrder = 'asc' | 'desc';

export function ComplaintsTable({ 
  onComplaintClick, 
  complaints: complaintsProp,
  onComplaintsUpdate 
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
        complaint.userName.toLowerCase().includes(searchTerm.toLowerCase());
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
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'PENDING': // database value, treated as open on the UI
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800';
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
    <Card>
      <CardHeader>
        <CardTitle>Complaints Management</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search by ID, title, or user name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
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
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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

        {/* Table */}
        <div className="overflow-x-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead className="min-w-48">Title</TableHead>
                <TableHead className='w-10'>Description</TableHead>
                <TableHead className="w-24 cursor-pointer" onClick={() => handleSort('severity')}>
                  Severity {sortField === 'severity' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="w-24 cursor-pointer" onClick={() => handleSort('status')}>
                  Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="min-w-32">User</TableHead>
                <TableHead className="w-28 cursor-pointer" onClick={() => handleSort('reportedDate')}>
                  Reported {sortField === 'reportedDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.length > 0 ? (
                filteredAndSorted.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-mono text-sm">#{complaint.id}</TableCell>
                    <TableCell className="font-medium">{complaint.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-xs" title={complaint.description}>
                      {complaint.description}
                    </TableCell>
                    <TableCell>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(complaint.severity)}`}>
                        {complaint.severity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(complaint.status)}`}>
                        {complaint.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{complaint.userName}</div>
                      <div className="text-xs text-muted-foreground">{complaint.userEmail}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(complaint.reportedDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onComplaintClick(complaint)}
                      >
                        Resolve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No complaints found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
