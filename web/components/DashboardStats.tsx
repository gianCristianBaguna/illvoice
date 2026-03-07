'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Complaint, getComplaintStats } from '@/lib/mockData';

interface DashboardStatsProps {
  complaints: Complaint[];
}

export function DashboardStats({ complaints }: DashboardStatsProps) {
  const stats = getComplaintStats(complaints);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Complaints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">All complaints</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Open
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.byStatus.OPEN}</div>
          <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            In Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.byStatus.IN_PROGRESS}</div>
          <p className="text-xs text-muted-foreground mt-1">Being worked on</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Resolved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.byStatus.RESOLVED}</div>
          <p className="text-xs text-muted-foreground mt-1">Completed</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Resolution Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.resolutionRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">Resolved/Total</p>
        </CardContent>
      </Card>
    </div>
  );
}
