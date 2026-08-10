'use client'

import { useAuth } from '@/contexts/auth-context'
import { BarChart3, LayoutDashboard, MapPin, Megaphone, Menu, MoreVertical, Phone, Settings, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

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
  const { adminRole, adminName, adminEmail } = useAuth()

  const displayName = adminName || adminEmail || 'Admin User'
  const initials = (adminName || adminEmail || 'A')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'A'

  const barangayItems = adminRole === 'BARANGAY_OFFICIAL'
    ? [
        { href: '/barangay-dashboard', label: 'My Dashboard', icon: <LayoutDashboard size={18} /> },
        { href: '/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
        { href: '/map', label: 'Map View', icon: <MapPin size={18} /> },
      ]
    : []

  const systemItems = [
    { href: '/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { href: '/announcements', label: 'Announcements', icon: <Megaphone size={18} /> },
    { href: '/emergency-numbers', label: 'Emergency Numbers', icon: <Phone size={18} /> },
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
        <div className="flex items-center gap-2 mb-8 shrink-0">
          <img
            src="/whitelogo.png"
            alt="ILLVoice logo"
            className="h-8 w-auto object-contain"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
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
        </div>

        {/* User Profile */}
        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs text-slate-400 truncate">
                {adminRole === 'BARANGAY_OFFICIAL' ? 'Barangay Official' : 'Super Admin'}
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
