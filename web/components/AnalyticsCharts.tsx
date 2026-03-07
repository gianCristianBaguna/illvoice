'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Complaint, getComplaintStats, getComplaintsTrend } from '@/lib/mockData';
import {
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

interface AnalyticsChartsProps {
  complaints: Complaint[];
}

export function AnalyticsCharts({ complaints }: AnalyticsChartsProps) {
  const stats = getComplaintStats(complaints);
  const trend = getComplaintsTrend(complaints);

  const severityData = [
    { name: 'HIGH', value: stats.bySeverity.HIGH, fill: '#dc2626' },
    { name: 'MODERATE', value: stats.bySeverity.MODERATE, fill: '#f59e0b' },
    { name: 'LOW', value: stats.bySeverity.LOW, fill: '#10b981' },
  ];

  const statusData = [
    { name: 'OPEN', value: stats.byStatus.OPEN, fill: '#ef4444' },
    { name: 'IN_PROGRESS', value: stats.byStatus.IN_PROGRESS, fill: '#eab308' },
    { name: 'RESOLVED', value: stats.byStatus.RESOLVED, fill: '#22c55e' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Severity Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Severity Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trends Over Time */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Trends (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="complaints"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
