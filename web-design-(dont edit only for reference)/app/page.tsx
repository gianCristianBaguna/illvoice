'use client'

import { Sidebar } from '@/components/sidebar'
import { AlertBanner } from '@/components/alert-banner'
import { StatCard } from '@/components/stat-card'
import { ComplaintsByHazardChart, ComplaintsByMonthChart, ResolutionRateChart } from '@/components/dashboard-charts'
import { ActivityFeed } from '@/components/activity-feed'
import { ReportsTable } from '@/components/reports-table'
import { FileText, Clock, Zap, CheckCircle } from 'lucide-react'

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      
      {/* Main Content */}
      <main className="ml-48 p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="search"
                placeholder="Search"
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Alert Banner */}
        <div className="mb-8">
          <AlertBanner />
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<FileText size={24} className="text-blue-600" />}
            iconBg="bg-blue-100"
            number="250"
            label="Total Complaints"
          />
          <StatCard
            icon={<Clock size={24} className="text-orange-500" />}
            iconBg="bg-orange-100"
            number="43"
            label="Pending Reports"
          />
          <StatCard
            icon={<Zap size={24} className="text-yellow-500" />}
            iconBg="bg-yellow-100"
            number="29"
            label="In Progress"
          />
          <StatCard
            icon={<CheckCircle size={24} className="text-green-600" />}
            iconBg="bg-green-100"
            number="175"
            label="Resolved Issues"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <ComplaintsByHazardChart />
          <ComplaintsByMonthChart />
          <ResolutionRateChart />
        </div>

        {/* Reports and Activity */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <ReportsTable />
          </div>
          <ActivityFeed />
        </div>
      </main>
    </div>
  )
}
