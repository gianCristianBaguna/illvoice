'use client'

import { useState } from 'react'
import { LayoutDashboard, BarChart3, MapPin, Users, Settings, MoreVertical, Menu, X } from 'lucide-react'

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-950 text-white rounded-lg"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`w-64 md:w-48 bg-slate-950 text-white flex flex-col p-6 fixed left-0 top-0 h-screen border-r border-slate-800 transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:z-30`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            I
          </div>
          <span className="font-semibold text-sm">ILLVoice</span>
        </div>

        {/* Main Menu */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Main</p>
          <nav className="space-y-2">
            <a href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">
              <LayoutDashboard size={18} />
              Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">
              <BarChart3 size={18} />
              Reports
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">
              <MapPin size={18} />
              Map View
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">
              <Users size={18} />
              Users
            </a>
          </nav>
        </div>

        {/* System Menu */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-3">System</p>
          <nav className="space-y-2">
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">
              <BarChart3 size={18} />
              Analytics
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">
              <Settings size={18} />
              Settings
            </a>
          </nav>
        </div>

        {/* User Profile */}
        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Juan Data Cruz</p>
              <p className="text-xs text-slate-400 truncate">Super Admin</p>
            </div>
            <button className="p-1 hover:bg-slate-800 rounded">
              <MoreVertical size={16} className="text-slate-400" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}