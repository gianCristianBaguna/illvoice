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
    <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-lg shadow-blue-100/50">
      <h3 className="text-xs md:text-sm font-semibold text-slate-800 mb-1">Complaints by Hazard Level</h3>
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
            stroke="#ffffff"
            strokeWidth={2}
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
            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.fill }} />
            <span className="text-xs font-medium text-slate-600">{item.name}</span>
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
  }))

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-lg shadow-purple-100/50">
      <h3 className="text-xs md:text-sm font-semibold text-slate-800 mb-1">Complaints Per Month</h3>
      <p className="text-xs text-slate-500 mb-2 md:mb-4">Past 12 months</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={complaintsByMonthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '0.75rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
            }} 
          />
          <Bar dataKey="complaints" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
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
    <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-lg shadow-green-100/50">
      <h3 className="text-xs md:text-sm font-semibold text-slate-800 mb-1">Resolution Rate</h3>
      <p className="text-xs text-slate-500 mb-2 md:mb-4">Weekly trend</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={resolutionRateData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '0.75rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
            }} 
          />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="url(#lineGradient)"
            strokeWidth={3}
            dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, fill: '#3b82f6' }}
            isAnimationActive={true}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}