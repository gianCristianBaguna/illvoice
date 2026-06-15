'use client'

import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Complaint } from '@/lib/mockData'

export function ComplaintsByHazardChart({ complaints }: { complaints: Complaint[] }) {
  const bySeverity = complaints.reduce(
    (acc, c) => {
      acc[c.severity] = (acc[c.severity] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const complaintsByHazardData = [
    { name: 'Low', value: bySeverity['LOW'] || 0, fill: '#10b981' },
    { name: 'Medium', value: bySeverity['MODERATE'] || 0, fill: '#f59e0b' },
    { name: 'High', value: bySeverity['HIGH'] || 0, fill: '#ef4444' },
  ]

  return (
    <div className="bg-white rounded-lg p-4 md:p-6 border border-slate-200 shadow-sm">
      <h3 className="text-xs md:text-sm font-semibold text-slate-900 mb-1">Complaints by Hazard Level</h3>
      <p className="text-xs text-slate-500 mb-2 md:mb-4">Current distribution</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={complaintsByHazardData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            dataKey="value"
            label={({ name, value }) => `${name} ${value}`}
          >
            {complaintsByHazardData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex gap-6 mt-4 justify-center">
        {complaintsByHazardData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: item.fill }} />
            <span className="text-xs text-slate-600">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ComplaintsByMonthChart({ complaints }: { complaints: Complaint[] }) {
  const byMonth = complaints.reduce(
    (acc, c) => {
      const month = new Date(c.reportedDate).toLocaleDateString('en-US', { month: 'short' })
      acc[month] = (acc[month] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const complaintsByMonthData = months.map(month => ({
    month,
    complaints: byMonth[month] || 0
  })).filter(m => m.complaints > 0)

  const defaultData = [
    { month: 'Jan', complaints: 0 },
    { month: 'Feb', complaints: 0 },
    { month: 'Mar', complaints: complaints.length },
  ]

  const data = complaintsByMonthData.length > 0 ? complaintsByMonthData : defaultData

  return (
    <div className="bg-white rounded-lg p-4 md:p-6 border border-slate-200 shadow-sm">
      <h3 className="text-xs md:text-sm font-semibold text-slate-900 mb-1">Complaints Per Month</h3>
      <p className="text-xs text-slate-500 mb-2 md:mb-4">Past 6 months</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
          <Bar dataKey="complaints" fill="#6366f1" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ResolutionRateChart({ complaints }: { complaints: Complaint[] }) {
  const total = complaints.length
  const resolved = complaints.filter(c => c.status === 'RESOLVED').length
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

  const resolutionRateData = [
    { week: 'Week 1', rate: 0 },
    { week: 'Week 2', rate: 0 },
    { week: 'Week 3', rate: 0 },
    { week: 'Week 4', rate: resolutionRate },
  ]

  return (
    <div className="bg-white rounded-lg p-4 md:p-6 border border-slate-200 shadow-sm">
      <h3 className="text-xs md:text-sm font-semibold text-slate-900 mb-1">Resolution Rate</h3>
      <p className="text-xs text-slate-500 mb-2 md:mb-4">Weekly trend</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={resolutionRateData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#a78bfa"
            strokeWidth={3}
            dot={{ fill: '#a78bfa', r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
          <defs>
            <linearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
            </linearGradient>
          </defs>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}