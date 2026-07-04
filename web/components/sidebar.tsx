'use client'

import { useState } from 'react'
import { LayoutDashboard, BarChart3, MapPin, Settings, MoreVertical, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
  { href: '/map', label: 'Map View', icon: <MapPin size={18} /> },
]

function getLinkClasses(isActive: boolean) {
  return `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
    isActive
      ? 'bg-blue-600 text-white font-medium'
      : 'text-slate-300 hover:bg-slate-800'
  }`
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { adminRole } = useAuth()

  const barangayItems = adminRole === 'BARANGAY_OFFICIAL'
    ? [
        { href: '/barangay-dashboard', label: 'My Dashboard', icon: <LayoutDashboard size={18} /> },
        { href: '/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
        { href: '/map', label: 'Map View', icon: <MapPin size={18} /> },
      ]
    : []

  const systemItems = [
    { href: '/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { href: '/barangays', label: 'Barangays', icon: <MapPin size={18} /> },
    { href: '/settings', label: 'Settings', icon: <Settings size={18} /> },
  ]

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
            {(adminRole === 'BARANGAY_OFFICIAL' ? barangayItems : navItems).map((item) => {
              const isActive = item.href !== '#' && pathname.startsWith(item.href)

              return item.href === '#' ? (
                <button
                  key={item.label}
                  type="button"
                  className={getLinkClasses(false)}
                >
                  {item.icon}
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={getLinkClasses(isActive)}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* System Menu - only for ADMIN role */}
        {adminRole === 'ADMIN' && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-3">System</p>
            <nav className="space-y-2">
              {systemItems.map((item) => {
                const isActive = item.href !== '#' && pathname.startsWith(item.href)

                return item.href === '#' ? (
                  <button
                    key={item.label}
                    type="button"
                    className={getLinkClasses(false)}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={getLinkClasses(isActive)}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}

        {/* User Profile */}
        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {adminRole === 'BARANGAY_OFFICIAL' ? 'BO' : 'JD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{adminRole === 'BARANGAY_OFFICIAL' ? 'Barangay Official' : 'Juan Data Cruz'}</p>
              <p className="text-xs text-slate-400 truncate">
                {adminRole === 'BARANGAY_OFFICIAL' ? 'Barangay Admin' : 'Super Admin'}
              </p>
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