import { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  iconBg: string
  number: string | number
  label: string
}

export function StatCard({ icon, iconBg, number, label }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${iconBg}`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-slate-900 mb-1">{number}</p>
      <p className="text-slate-500 text-sm">{label}</p>
    </div>
  )
}
