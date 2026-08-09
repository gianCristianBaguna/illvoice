'use client'

import { Sidebar } from '@/components/sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/auth-context'
import {
    deleteBarangayAccount,
    deleteUser,
    fetchBarangayAccounts,
    fetchUsers,
    updateBarangayAccount,
    updateUserPassword,
    updateUserStatus
} from '@/lib/api'
import { reverseGeocode } from '@/lib/reverseGeocode'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'
import {
    Activity,
    Bell,
    Edit,
    LogOut,
    Mail,
    MailCheck,
    MapPin,
    Plus,
    Shield,
    Trash2,
    User,
    Users,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

type SettingsTab = 'profile' | 'notifications' | 'register-official' | 'register-barangay' | 'manage-barangays' | 'manage-officials'

interface AdminProfile {
  email: string
  role: 'ADMIN' | 'BARANGAY_OFFICIAL'
  name?: string
}

interface Barangay {
  id: string
  name: string
  latitude?: number
  longitude?: number
}

interface BarangayAccount {
  id: string
  name: string
  latitude: number
  longitude: number
  address: string | null
  boundaryPolygon?: any
  officialCount?: number
}

interface BarangayOfficial {
  id: string
  email: string
  name: string | null
  phoneNumber: string | null
  barangayId: string | null
  barangayName?: string | null
  createdAt: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [barangays, setBarangays] = useState<Barangay[]>([])
  const [barangayAccounts, setBarangayAccounts] = useState<BarangayAccount[]>([])
  const [officials, setOfficials] = useState<BarangayOfficial[]>([])
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regFullName, setRegFullName] = useState('')
  const [selectedBarangayId, setSelectedBarangayId] = useState('')
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState(false)
  const [editBarangay, setEditBarangay] = useState<BarangayAccount | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [barangayToDelete, setBarangayToDelete] = useState<string | null>(null)
  const [editOfficialPassword, setEditOfficialPassword] = useState('')
  const [editOfficialStatus, setEditOfficialStatus] = useState<{[key: string]: boolean}>({})
  const [regBarangayName, setRegBarangayName] = useState('')
  const [regBarangayLat, setRegBarangayLat] = useState('')
  const [regBarangayLng, setRegBarangayLng] = useState('')
  const [regBarangayAddress, setRegBarangayAddress] = useState('')
  const [regBarangayMapAddress, setRegBarangayMapAddress] = useState('')
  const [boundaryCoords, setBoundaryCoords] = useState<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const leafletRef = useRef<any>(null)
  const { isAuthenticated, logout, adminEmail, adminRole, emailVerified, setEmailVerified } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setProfile({
            email: data.email,
            role: data.role || 'ADMIN',
            name: data.name || adminEmail?.split('@')[0],
          })
        } else {
          setProfile({
            email: adminEmail || 'admin@illvoice.local',
            role: adminRole || 'ADMIN',
            name: adminEmail?.split('@')[0],
          })
        }
      } catch {
        setProfile({
          email: adminEmail || 'admin@illvoice.local',
          role: adminRole || 'ADMIN',
          name: adminEmail?.split('@')[0],
        })
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchProfile()
    }
  }, [isAuthenticated, adminEmail, adminRole])

  useEffect(() => {
    if ((activeTab === 'register-official' || activeTab === 'register-barangay') && isAuthenticated) {
      fetchBarangays()
    }
  }, [activeTab, isAuthenticated])

  const fetchBarangays = async () => {
    try {
      const response = await fetch('/api/admin/barangays')
      if (response.ok) {
        const data = await response.json()
        setBarangays(data)
      }
    } catch (err) {
      console.error('Error fetching barangays:', err)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  const handleRegisterOfficial = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')
    setRegSuccess(false)

    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('adminToken='))
        ?.split('=')[1]

      const response = await fetch('/api/auth/register-barangay-official', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          fullName: regFullName,
          barangayId: selectedBarangayId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      setRegSuccess(true)
      setRegEmail('')
      setRegPassword('')
      setRegFullName('')
      setSelectedBarangayId('')
      setTimeout(() => setRegSuccess(false), 3000)
    } catch (err: any) {
      setRegError(err.message || 'Registration failed')
    }
  }

  const handleRegisterBarangay = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')
    setRegSuccess(false)

    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('adminToken='))
        ?.split('=')[1]

      if (!regBarangayLat || !regBarangayLng) {
        throw new Error('Please select a location on the map')
      }

      const response = await fetch('/api/admin/barangays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: regBarangayName,
          latitude: parseFloat(regBarangayLat),
          longitude: parseFloat(regBarangayLng),
          address: regBarangayAddress || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register barangay')
      }

      setRegSuccess(true)
      setRegBarangayName('')
      setRegBarangayLat('')
      setRegBarangayLng('')
      setRegBarangayAddress('')
      setRegBarangayMapAddress('')
      await fetchBarangays()
      setTimeout(() => setRegSuccess(false), 3000)
    } catch (err: any) {
      setRegError(err.message || 'Registration failed')
    }
  }

  const DEFAULT_CENTER: [number, number] = [10.7202, 122.5621]

  const fetchBarangayAccountsList = async () => {
    try {
      const accounts = await fetchBarangayAccounts()
      setBarangayAccounts(accounts)
    } catch (err) {
      console.error('Error fetching barangay accounts:', err)
    }
  }

  const fetchOfficials = async () => {
    try {
      const users = await fetchUsers()
      const barangayOfficials = users
        .filter((u) => u.role === 'BARANGAY_OFFICIAL')
        .map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          phoneNumber: u.phoneNumber,
          barangayId: u.barangayId,
          barangayName: barangays.find((b) => b.id === u.barangayId)?.name || null,
          createdAt: u.createdAt,
        }))
      setOfficials(barangayOfficials)
    } catch (err) {
      console.error('Error fetching officials:', err)
    }
  }

  useEffect(() => {
    if ((activeTab === 'register-official' || activeTab === 'register-barangay' || activeTab === 'manage-barangays') && isAuthenticated) {
      fetchBarangays()
      fetchBarangayAccountsList()
    }
    if (activeTab === 'manage-officials' && isAuthenticated) {
      fetchBarangays()
      fetchOfficials()
    }
  }, [activeTab, isAuthenticated])

  const handleDeleteBarangay = async () => {
    if (!barangayToDelete) return
    try {
      await deleteBarangayAccount(barangayToDelete)
      toast.success('Barangay deleted successfully')
      fetchBarangayAccountsList()
      setDeleteConfirmOpen(false)
      setBarangayToDelete(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete barangay')
    }
  }

  const handleUpdateBarangay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editBarangay) return

    try {
      await updateBarangayAccount(editBarangay.id, {
        name: editBarangay.name,
        latitude: editBarangay.latitude,
        longitude: editBarangay.longitude,
        address: editBarangay.address,
      })
      toast.success('Barangay updated successfully')
      setEditModalOpen(false)
      setEditBarangay(null)
      fetchBarangayAccountsList()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update barangay')
    }
  }

  const handleUpdateOfficialPassword = async (officialId: string) => {
    if (!editOfficialPassword) return
    try {
      await updateUserPassword(officialId, editOfficialPassword)
      toast.success('Password updated successfully')
      setEditOfficialPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password')
    }
  }

  const handleToggleOfficialStatus = async (officialId: string, currentStatus: boolean) => {
    try {
      await updateUserStatus(officialId, !currentStatus)
      toast.success(`Official ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      fetchOfficials()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status')
    }
  }

  const handleDeleteOfficial = async (officialId: string) => {
    if (!confirm('Are you sure you want to delete this official? This action cannot be undone.')) return
    try {
      await deleteUser(officialId)
      toast.success('Official deleted successfully')
      fetchOfficials()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete official')
    }
  }

  const reverseGeocodeRequestIdRef = useRef(0)

  const reverseGeocodeLocation = useCallback(async (lat: number, lng: number) => {
    const requestId = ++reverseGeocodeRequestIdRef.current
    try {
      const result = await reverseGeocode(lat, lng)

      if (requestId !== reverseGeocodeRequestIdRef.current) return

      if (result.displayName) {
        setRegBarangayAddress(result.displayName)
        setRegBarangayMapAddress(result.displayName)
      }

      if (result.barangayName) {
        setRegBarangayName(result.barangayName)
      }
    } catch {
      if (requestId !== reverseGeocodeRequestIdRef.current) return
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'register-barangay' || !mapContainerRef.current) return;

    let cancelled = false;

    const initBarangayMap = async () => {
      if (!mapContainerRef.current || leafletRef.current) return;

      const leaflet = await import('leaflet');
      const L = (leaflet.default || leaflet) as any;

      if (cancelled) return;

      leafletRef.current = L;

      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 12,
        scrollWheelZoom: true,
      });

      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        setRegBarangayLat(lat.toString());
        setRegBarangayLng(lng.toString());
        reverseGeocodeLocation(lat, lng);

        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }
        const newMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = newMarker;

        newMarker.on('dragend', () => {
          const newPos = newMarker.getLatLng();
          setRegBarangayLat(newPos.lat.toString());
          setRegBarangayLng(newPos.lng.toString());
          reverseGeocodeLocation(newPos.lat, newPos.lng);
        });

        map.setView([lat, lng], map.getZoom());
      });

      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    initBarangayMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        leafletRef.current = null;
        markerRef.current = null;
      }
    };
  }, [activeTab, reverseGeocodeLocation]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    ...(adminRole === 'ADMIN' ? [
      { id: 'register-official' as const, label: 'Register Official', icon: <Plus size={16} /> },
      { id: 'register-barangay' as const, label: 'Register Barangay', icon: <MapPin size={16} /> },
      { id: 'manage-barangays' as const, label: 'Manage Barangays', icon: <MapPin size={16} /> },
      { id: 'manage-officials' as const, label: 'Manage Officials', icon: <Users size={16} /> },
    ] : []),
  ]

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">Super Admin</Badge>
      case 'BARANGAY_OFFICIAL':
        return <Badge variant="secondary" className="bg-purple-600 text-white hover:bg-purple-700">Barangay Official</Badge>
      default:
        return <Badge variant="outline" className="text-black border-black">{role}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <Sidebar />

      <div className="md:ml-48">
        <header className="border-b border-slate-200 bg-white">
          <div className="px-4 py-4 md:px-6 md:py-6">
            <div className="flex items-center justify-between">
              <div className="ml-10 md:ml-0">
                <h1 className="text-xl md:text-2xl font-bold text-black">Settings</h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  Manage your account preferences
                </p>
              </div>
              <Button onClick={handleLogout} size="sm" className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="px-3 py-4 md:px-6 md:py-6">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-slate-600">Loading settings...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                <div className="lg:col-span-1">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <nav className="p-2">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                            activeTab === tab.id
                              ? 'bg-white text-black font-medium'
                              : 'text-black hover:bg-white'
                          }`}
                        >
                          {tab.icon}
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-6">
                  {!emailVerified && adminRole !== 'ADMIN' && adminRole !== 'BARANGAY_OFFICIAL' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield size={20} className="text-yellow-600" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Email Not Verified</p>
                          <p className="text-xs text-yellow-600">Verify your email to access all features</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const token = document.cookie.split('; ').find((row) => row.startsWith('adminToken='))?.split('=')[1];
                          const res = await fetch('/api/auth/verify-email/send-code', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                          });
                          const data = await res.json();
                          if (res.ok) {
                            toast.success(data.message || 'Verification code sent');
                          } else {
                            toast.error(data.error || 'Failed to send code');
                          }
                        }}
                        className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700"
                      >
                        Verify Email
                      </button>
                    </div>
                  )}
                  {activeTab === 'profile' && (
                    <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle className="text-base font-semibold text-black">Account Information</CardTitle>
                        <CardDescription className="text-slate-600">View your admin account details</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
                            {(profile?.name || profile?.email || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-black">
                              {profile?.name || profile?.email?.split('@')[0] || 'Admin User'}
                            </h3>
                            <p className="text-sm text-slate-600">{profile?.email}</p>
                            <div className="mt-1">{getRoleBadge(profile?.role || 'ADMIN')}</div>
                          </div>
                        </div>
                        <Separator className="bg-slate-200" />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                           <div className="space-y-1.5">
                             <label className="text-sm font-medium text-black flex items-center gap-2">
                               <Mail size={14} className="text-slate-600" />
                               Email Address
                             </label>
                             <Input value={profile?.email || ''} disabled className="bg-white border-slate-200 text-black font-mono text-sm" />
                           </div>
                           <div className="space-y-1.5">
                             <label className="text-sm font-medium text-black flex items-center gap-2">
                               <MailCheck size={14} className="text-slate-600" />
                               Email Status
                             </label>
                             <div className="flex items-center gap-2 pt-2">
                               <span className={`relative flex h-2.5 w-2.5 rounded-full ${emailVerified ? 'bg-green-500' : 'bg-yellow-500'}`} />
                               <span className={`text-sm font-medium ${emailVerified ? 'text-green-700' : 'text-yellow-700'}`}>
                                 {emailVerified ? 'Verified' : 'Unverified'}
                               </span>
                             </div>
                           </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-black flex items-center gap-2">
                              <User size={14} className="text-slate-600" />
                              Display Name
                            </label>
                            <Input
                              value={profile?.name || ''}
                              onChange={(e) => setProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                              className="bg-white border-slate-200 text-black"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-black flex items-center gap-2">
                              <Shield size={14} className="text-slate-600" />
                              Role
                            </label>
                            <div className="pt-2">{getRoleBadge(profile?.role || 'ADMIN')}</div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-black flex items-center gap-2">
                              <Activity size={14} className="text-slate-600" />
                              Account Status
                            </label>
                            <div className="flex items-center gap-2 pt-2">
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                              </span>
                              <span className="text-sm text-green-700 font-medium">Active</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end pt-2">
                          <Button onClick={() => setSaving(true)} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'notifications' && (
                    <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle className="text-base font-semibold text-black">Notification Preferences</CardTitle>
                        <CardDescription className="text-slate-600">Choose what alerts and notifications you receive</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        {[
                          { label: 'New complaint reports', desc: 'Receive alerts when new complaints are submitted to the system' },
                          { label: 'Status changes', desc: 'Get notified when a complaint status is updated' },
                          { label: 'High severity alerts', desc: 'Immediate notification for high priority complaints' },
                          { label: 'Weekly summary', desc: 'Receive a weekly digest of complaint activity and metrics' },
                          { label: 'System updates', desc: 'Get notified about platform maintenance and new features' },
                        ].map((item) => (
                          <div key={item.label} className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-black">{item.label}</p>
                              <p className="text-xs text-slate-600">{item.desc}</p>
                            </div>
                            <Switch defaultChecked={item.label !== 'System updates'} />
                          </div>
                        ))}
                        <div className="flex justify-end pt-4">
                          <Button className="bg-blue-600 hover:bg-blue-700 text-white">Save Preferences</Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'register-official' && adminRole === 'ADMIN' && (
                    <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
                       <CardHeader className="border-b border-slate-100">
                         <CardTitle className="text-base font-semibold text-black">Register Barangay Official</CardTitle>
                         <CardDescription className="text-black">Create a new barangay official account</CardDescription>
                       </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        {regError && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
                            {regError}
                          </div>
                        )}
                        {regSuccess && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800">
                            Barangay official registered successfully!
                          </div>
                        )}
                         <form onSubmit={handleRegisterOfficial} className="space-y-4">
                           <div className="space-y-1.5">
                             <Label htmlFor="reg-email" className="text-black">Email</Label>
                             <Input
                               id="reg-email"
                               type="email"
                               value={regEmail}
                               onChange={(e) => setRegEmail(e.target.value)}
                               placeholder="official@barangay.gov"
                               required
                               className="bg-white dark:bg-white text-black"
                             />
                           </div>
                           <div className="space-y-1.5">
                             <Label htmlFor="reg-fullname" className="text-black">Full Name</Label>
                             <Input
                               id="reg-fullname"
                               value={regFullName}
                               onChange={(e) => setRegFullName(e.target.value)}
                               placeholder="Juan Dela Cruz"
                               required
                               className="bg-white dark:bg-white text-black"
                             />
                           </div>
                           <div className="space-y-1.5">
                             <Label htmlFor="reg-barangay" className="text-black">Barangay</Label>
                             <Select value={selectedBarangayId} onValueChange={setSelectedBarangayId} required>
                               <SelectTrigger id="reg-barangay" className="bg-white dark:bg-white text-black">
                                 <SelectValue placeholder="Select a barangay" />
                               </SelectTrigger>
                               <SelectContent>
                                 {barangays.map((barangay) => (
                                   <SelectItem key={barangay.id} value={barangay.id}>
                                     {barangay.name}
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                           </div>
                           <div className="space-y-1.5">
                             <Label htmlFor="reg-password" className="text-black">Password</Label>
                             <Input
                               id="reg-password"
                               type="password"
                               value={regPassword}
                               onChange={(e) => setRegPassword(e.target.value)}
                               placeholder="••••••••"
                               required
                               className="bg-white dark:bg-white text-black"
                             />
                           </div>
                           <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                             Register Barangay Official
                           </Button>
                         </form>
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'register-barangay' && adminRole === 'ADMIN' && (
                     <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
                       <CardHeader className="border-b border-slate-100">
                         <CardTitle className="text-base font-semibold text-black">Register Barangay Account</CardTitle>
                         <CardDescription className="text-black">Create a new barangay with location</CardDescription>
                       </CardHeader>
                       <CardContent className="p-6 space-y-4">
                         {regError && (
                           <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
                             {regError}
                           </div>
                         )}
                         {regSuccess && (
                           <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800">
                             Barangay registered successfully!
                           </div>
                         )}
                          <form onSubmit={handleRegisterBarangay} className="space-y-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="barangay-name" className="text-black">Barangay Name</Label>
                              <Input
                                id="barangay-name"
                                value={regBarangayName}
                                onChange={(e) => setRegBarangayName(e.target.value)}
                                placeholder="e.g., Barangay San Isidro"
                                required
                                className="bg-white dark:bg-white text-black"
                              />
                            </div>

                             <div className="space-y-1.5">
                               <Label className="text-black">Selected location</Label>
                              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-black">
                                {regBarangayAddress
                                  ? regBarangayAddress
                                  : 'Click on the map to select the barangay location.'}
                              </div>
                            </div>

                            <div>
                              <Label className="text-black">Location on Map</Label>
                              <p className="text-xs text-black mb-2">Click on the map to place a marker, or drag the marker to adjust the location.</p>
                              <div ref={mapContainerRef} className="map-container h-[400px] w-full rounded-lg border" />
                              {regBarangayMapAddress && (
                                <p className="text-xs text-black mt-2">Selected address: {regBarangayMapAddress}</p>
                              )}
                            </div>

                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                              Register Barangay
                            </Button>
                         </form>
                       </CardContent>
                     </Card>
                  )}

                  {activeTab === 'manage-barangays' && adminRole === 'ADMIN' && (
                    <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle className="text-base font-semibold text-black">Manage Barangay Accounts</CardTitle>
                        <CardDescription className="text-slate-600">View, edit, and manage all barangay accounts</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        {barangayAccounts.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            No barangay accounts registered yet.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {barangayAccounts.map((barangay) => (
                              <div key={barangay.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                  <h4 className="font-medium text-black">{barangay.name}</h4>
                                  <p className="text-sm text-slate-600">{barangay.address || 'No address'}</p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {barangay.officialCount || 0} official(s) assigned
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Lat: {barangay.latitude.toFixed(4)}, Lng: {barangay.longitude.toFixed(4)}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditBarangay(barangay)
                                      setEditModalOpen(true)
                                    }}
                                  >
                                    <Edit size={14} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setBarangayToDelete(barangay.id)
                                      setDeleteConfirmOpen(true)
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'manage-officials' && adminRole === 'ADMIN' && (
                    <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle className="text-base font-semibold text-black">Manage Barangay Officials</CardTitle>
                        <CardDescription className="text-slate-600">View and manage all barangay officials</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        {officials.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            No barangay officials registered yet.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {officials.map((official) => (
                              <div key={official.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                  <h4 className="font-medium text-black">{official.name || official.email}</h4>
                                  <p className="text-sm text-slate-600">{official.email}</p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    Barangay: {official.barangayName || 'Unassigned'}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateOfficialPassword(official.id)}
                                    disabled={!editOfficialPassword}
                                  >
                                    Reset Password
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteOfficial(official.id)}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Delete</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <p className="text-slate-600 mb-4">
                          Are you sure you want to delete this barangay account? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleDeleteBarangay}>
                            Delete Barangay
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={editModalOpen} onOpenChange={(open) => {
                    setEditModalOpen(open)
                    if (!open) setEditBarangay(null)
                  }}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Barangay</DialogTitle>
                      </DialogHeader>
                       <form onSubmit={handleUpdateBarangay} className="space-y-4 py-4">
                         <div className="space-y-1.5">
                           <Label htmlFor="edit-name" className="text-black">Barangay Name</Label>
                           <Input
                             id="edit-name"
                             value={editBarangay?.name || ''}
                             onChange={(e) => setEditBarangay(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                             required
                             className="bg-white dark:bg-white text-black"
                           />
                         </div>
                         <div className="space-y-1.5">
                           <Label htmlFor="edit-address" className="text-black">Address</Label>
                           <Input
                             id="edit-address"
                             value={editBarangay?.address || ''}
                             onChange={(e) => setEditBarangay(prev => prev ? ({ ...prev, address: e.target.value }) : null)}
                             className="bg-white dark:bg-white text-black"
                           />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                             <Label htmlFor="edit-lat" className="text-black">Latitude</Label>
                             <Input
                               id="edit-lat"
                               type="number"
                               step="any"
                               value={editBarangay?.latitude || ''}
                               onChange={(e) => setEditBarangay(prev => prev ? ({ ...prev, latitude: parseFloat(e.target.value) }) : null)}
                               readOnly
                               className="bg-white dark:bg-white text-black"
                             />
                           </div>
                           <div className="space-y-1.5">
                             <Label htmlFor="edit-lng" className="text-black">Longitude</Label>
                             <Input
                               id="edit-lng"
                               type="number"
                               step="any"
                               value={editBarangay?.longitude || ''}
                               onChange={(e) => setEditBarangay(prev => prev ? ({ ...prev, longitude: parseFloat(e.target.value) }) : null)}
                               readOnly
                               className="bg-white dark:bg-white text-black"
                             />
                           </div>
                         </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
