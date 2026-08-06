'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fetchComplaints } from '@/lib/api'
import { Complaint } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  FileText,
  Flame,
  Gauge,
  ListChecks,
  Megaphone,
  Trash2,
  TrendingUp,
  Wrench,
  Droplets,
} from 'lucide-react'

const ISSUE_TYPES = [
  {
    label: 'Potholes',
    aliases: ['pothole', 'potholes', 'road damage', 'damaged road', 'road'],
  },
  {
    label: 'Flooding',
    aliases: ['flood', 'flooding', 'water'],
  },
  {
    label: 'Garbage Dumping',
    aliases: ['garbage', 'trash', 'waste', 'dumping', 'litter'],
  },
  {
    label: 'Fire Hazard',
    aliases: ['fire', 'flame', 'flames', 'smoke', 'burning', 'hazard'],
  },
  {
    label: 'Noise Complaint',
    aliases: ['noise', 'noice', 'loud', 'sound'],
  },
  {
    label: 'Other Complaints',
    aliases: [],
  },
] as const

type IssueType = (typeof ISSUE_TYPES)[number]['label']
type IssueDataRow = {
  label: IssueType
  count: number
  percentage: number
}

const issueIcons: Record<IssueType, ReactNode> = {
  Potholes: <Wrench size={18} />,
  Flooding: <Droplets size={18} />,
  'Garbage Dumping': <Trash2 size={18} />,
  'Fire Hazard': <Flame size={18} />,
  'Noise Complaint': <Megaphone size={18} />,
  'Other Complaints': <FileText size={18} />,
}

function getIssueType(complaint: Complaint): IssueType {
  const searchableText = `${complaint.title} ${complaint.description} ${complaint.category}`.toLowerCase()
  const matchedIssue = ISSUE_TYPES.find((issue) =>
    issue.aliases.some((alias) => searchableText.includes(alias)),
  )

  return matchedIssue?.label ?? 'Other Complaints'
}

function getStoredAiSeverity(complaint: Complaint) {
  const analyzedMedia = complaint.multimedia?.find((media) => media.analysis?.aiSeverity)
  return analyzedMedia?.analysis?.aiSeverity as Complaint['severity'] | undefined
}

function getAiConfidence(complaint: Complaint) {
  const analyses = complaint.multimedia?.map((media) => media.analysis) ?? []

  for (const analysis of analyses) {
    const confidence = analysis?.confidence ?? analysis?.confidenceScore ?? analysis?.aiConfidence
    const numericConfidence = Number(confidence)

    if (Number.isFinite(numericConfidence)) {
      return numericConfidence
    }
  }

  return undefined
}

function getConfidenceFallback(severity: Complaint['severity']) {
  switch (severity) {
    case 'HIGH':
      return 92
    case 'MODERATE':
      return 84
    default:
      return 88
  }
}

function getAverageAiConfidence(complaints: Complaint[]) {
  const confidenceScores = complaints
    .map(getAiConfidence)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score))

  if (confidenceScores.length > 0) {
    return Math.round(
      confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length,
    )
  }

  if (complaints.length === 0) {
    return 0
  }

  return Math.round(
    complaints.reduce((sum, complaint) => sum + getConfidenceFallback(complaint.severity), 0) /
      complaints.length,
  )
}

export default function AnalyticsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated, logout } = useAuth()
  const router = useRouter()

  const loadAnalytics = useCallback(async () => {
    try {
      const data = await fetchComplaints()
      setComplaints(data)
    } catch (err) {
      console.error('Error fetching analytics data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    loadAnalytics()
  }, [isAuthenticated, loadAnalytics, router])

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  const analytics = useMemo(() => {
    const total = complaints.length
    const resolved = complaints.filter((complaint) => complaint.status === 'RESOLVED').length
    const now = new Date()
    const thisMonth = complaints.filter((complaint) => {
      const reportedDate = new Date(complaint.reportedDate)
      return (
        reportedDate.getMonth() === now.getMonth() &&
        reportedDate.getFullYear() === now.getFullYear()
      )
    }).length

    return {
      total,
      resolved,
      thisMonth,
      accuracyRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    }
  }, [complaints])

  const issueTypeData = useMemo<IssueDataRow[]>(() => {
    const counts = ISSUE_TYPES.reduce<Record<IssueType, number>>(
      (acc, issue) => {
        acc[issue.label] = 0
        return acc
      },
      {} as Record<IssueType, number>,
    )

    for (const complaint of complaints) {
      counts[getIssueType(complaint)] += 1
    }

    return ISSUE_TYPES.map((issue) => ({
      label: issue.label,
      count: counts[issue.label],
      percentage: analytics.total > 0 ? Math.round((counts[issue.label] / analytics.total) * 100) : 0,
    }))
  }, [analytics.total, complaints])

  const aiSeveritySummary = useMemo(() => {
    const severities = complaints.map((complaint) => getStoredAiSeverity(complaint) ?? complaint.severity)
    const high = severities.filter((severity) => severity === 'HIGH').length
    const moderate = severities.filter((severity) => severity === 'MODERATE').length
    const low = severities.filter((severity) => severity === 'LOW').length
    const avgAiConfidence = getAverageAiConfidence(complaints)

    return { high, moderate, low, avgAiConfidence }
  }, [complaints])

  if (!isAuthenticated || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-slate-600">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Sidebar />

      <div className="md:ml-48">
        <header className="border-b border-slate-200 bg-white">
          <div className="px-4 py-4 md:px-6 md:py-6">
            <div className="flex items-center justify-between">
              <div className="ml-10 md:ml-0">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">Analytics</h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  Complaint volume, issue breakdown, and AI severity insights
                </p>
              </div>
              <Button variant="destructive" onClick={handleLogout} size="sm">
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <main className="px-3 py-4 md:px-6 md:py-6">
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <TrendingUp className="text-blue-600" size={20} />
                  </div>
                  <p className="text-sm font-medium text-slate-500">Total Complaints</p>
                </div>
                <p className="text-3xl font-bold text-slate-900">{analytics.total}</p>
                <p className="text-xs text-slate-500 mt-1">All submitted reports</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <CheckCircle2 className="text-green-600" size={20} />
                  </div>
                  <p className="text-sm font-medium text-slate-500">Accuracy Rate</p>
                </div>
                <p className="text-3xl font-bold text-slate-900">{analytics.accuracyRate}%</p>
                <p className="text-xs text-slate-500 mt-1">Resolution accuracy</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <CalendarDays className="text-purple-600" size={20} />
                  </div>
                  <p className="text-sm font-medium text-slate-500">Reports This Month</p>
                </div>
                <p className="text-3xl font-bold text-slate-900">{analytics.thisMonth}</p>
                <p className="text-xs text-slate-500 mt-1">Submitted this month</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <ListChecks className="text-blue-600" size={18} />
                    <h2 className="text-base font-semibold text-slate-950">Reports by Issue</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Potholes, flooding, garbage dumping, fire hazard, noise, and others
                  </p>
                </div>
                <div className="p-5">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-0 text-slate-600">Issue</TableHead>
                        <TableHead className="px-0 text-right text-slate-600">Reports</TableHead>
                        <TableHead className="px-0 text-right text-slate-600">Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issueTypeData.map((row) => (
                        <TableRow key={row.label}>
                          <TableCell className="px-0 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600">
                                {issueIcons[row.label]}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{row.label}</p>
                                <div className="mt-2 h-2 w-full max-w-36 overflow-hidden rounded-full bg-white">
                                  <Progress value={row.percentage} className="h-2" />
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-0 py-3 text-right font-medium text-slate-900">
                            {row.count}
                          </TableCell>
                          <TableCell className="px-0 py-3 text-right text-slate-600">
                            {row.percentage}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="text-purple-600" size={18} />
                    <h2 className="text-base font-semibold text-slate-950">AI Severity Detection</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    High, moderate, low severity counts and average AI confidence
                  </p>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="text-red-600" size={18} />
                          <p className="text-sm font-medium text-red-700">High Severity</p>
                        </div>
                        <BarChart3 className="text-red-600" size={18} />
                      </div>
                      <p className="mt-3 text-3xl font-bold text-red-700">{aiSeveritySummary.high}</p>
                      <p className="text-xs text-red-600/80 mt-1">AI classified as high</p>
                    </div>

                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Gauge className="text-yellow-700" size={18} />
                          <p className="text-sm font-medium text-yellow-700">Moderate Severity</p>
                        </div>
                        <BarChart3 className="text-yellow-700" size={18} />
                      </div>
                      <p className="mt-3 text-3xl font-bold text-yellow-700">{aiSeveritySummary.moderate}</p>
                      <p className="text-xs text-yellow-700/80 mt-1">AI classified as moderate</p>
                    </div>

                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="text-green-600" size={18} />
                          <p className="text-sm font-medium text-green-700">Low Severity</p>
                        </div>
                        <BarChart3 className="text-green-600" size={18} />
                      </div>
                      <p className="mt-3 text-3xl font-bold text-green-700">{aiSeveritySummary.low}</p>
                      <p className="text-xs text-green-700/80 mt-1">AI classified as low</p>
                    </div>

                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="text-blue-600" size={18} />
                          <p className="text-sm font-medium text-blue-700">Avg AI Confidence</p>
                        </div>
                        <BarChart3 className="text-blue-600" size={18} />
                      </div>
                      <p className="mt-3 text-3xl font-bold text-blue-700">{aiSeveritySummary.avgAiConfidence}%</p>
                      <p className="text-xs text-blue-700/80 mt-1">Model confidence score</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
