'use client';

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
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/auth-context'
import {
  createEmergencyNumber,
  deleteEmergencyNumber,
  fetchEmergencyNumbers,
  updateEmergencyNumber,
} from '@/lib/api'
import type { EmergencyNumber } from '@/lib/api'
import { Phone, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function EmergencyContactsPage() {
  const [numbers, setNumbers] = useState<EmergencyNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingNumber, setEditingNumber] = useState<EmergencyNumber | null>(null)
  const [formData, setFormData] = useState({
    category: '',
    number: '',
    label: '',
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    loadNumbers()
  }, [isAuthenticated, router])

  const loadNumbers = async () => {
    try {
      const data = await fetchEmergencyNumbers()
      setNumbers(data)
    } catch (err) {
      console.error('Error fetching emergency numbers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (number?: EmergencyNumber) => {
    if (number) {
      setEditingNumber(number)
      setFormData({
        category: number.category,
        number: number.number,
        label: number.label || '',
        isActive: number.isActive,
      })
    } else {
      setEditingNumber(null)
      setFormData({
        category: '',
        number: '',
        label: '',
        isActive: true,
      })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingNumber) {
        await updateEmergencyNumber(editingNumber.id, formData)
        toast.success('Emergency number updated successfully')
      } else {
        await createEmergencyNumber(formData)
        toast.success('Emergency number created successfully')
      }
      setDialogOpen(false)
      loadNumbers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save emergency number')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingNumber) return
    try {
      await deleteEmergencyNumber(editingNumber.id)
      toast.success('Emergency number deleted successfully')
      setDeleteOpen(false)
      setEditingNumber(null)
      loadNumbers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete emergency number')
    }
  }

  const getCategoryColor = (category: string) => {
    const lower = category.toLowerCase()
    if (lower.includes('police')) return '#1E3A8A'
    if (lower.includes('fire')) return '#dc2626'
    if (lower.includes('medical') || lower.includes('hospital')) return '#059669'
    if (lower.includes('barangay')) return '#d97706'
    return '#666'
  }

  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase()
    if (lower.includes('police')) return 'shield'
    if (lower.includes('fire')) return 'flame'
    if (lower.includes('medical') || lower.includes('hospital')) return 'medkit'
    if (lower.includes('barangay')) return 'home'
    return 'call'
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <Sidebar />

      <div className="md:ml-48">
        <header className="border-b border-slate-200 bg-white">
          <div className="px-4 py-4 md:px-6 md:py-6">
            <div className="flex items-center justify-between">
              <div className="ml-10 md:ml-0">
                <h1 className="text-xl md:text-2xl font-bold text-black">Emergency Contacts</h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  Manage emergency contact numbers
                </p>
              </div>
              <Button onClick={() => handleOpenDialog()} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus size={16} />
                <span className="hidden sm:inline">Add Number</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="px-3 py-4 md:px-6 md:py-6">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-slate-600">Loading emergency numbers...</div>
              </div>
            ) : numbers.length === 0 ? (
              <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
                <CardContent className="p-12 text-center">
                  <Phone size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-black mb-2">No emergency numbers yet</h3>
                  <p className="text-sm text-slate-500 mb-4">Add emergency contact numbers for the community</p>
                  <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus size={16} className="mr-2" />
                    Add Emergency Number
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {numbers.map((item) => (
                  <Card key={item.id} className="rounded-xl border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge className="text-white border-0" style={{ backgroundColor: getCategoryColor(item.category) }}>
                              {item.category}
                            </Badge>
                            {item.label && (
                              <span className="text-sm text-slate-500">- {item.label}</span>
                            )}
                            {!item.isActive && (
                              <Badge variant="outline" className="text-slate-500 border-slate-300">Inactive</Badge>
                            )}
                          </div>
                          <h3 className="text-base md:text-lg font-semibold text-black mb-1">{item.number}</h3>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>
                              {new Date(item.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex md:flex-col gap-2 md:ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(item)}
                            className="flex-1 md:flex-none"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setEditingNumber(item)
                              setDeleteOpen(true)
                            }}
                            className="flex-1 md:flex-none"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-white text-black">
          <DialogHeader>
            <DialogTitle>{editingNumber ? 'Edit Emergency Number' : 'Add Emergency Number'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-black">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Police, Fire, Medical, Barangay"
                required
                className="bg-white dark:bg-white border-slate-200 text-black"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="number" className="text-black">Number</Label>
              <Input
                id="number"
                value={formData.number}
                onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                placeholder="e.g., 911, 117, +63-2-1234"
                required
                className="bg-white dark:bg-white border-slate-200 text-black"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="label" className="text-black">Label (Optional)</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Main Station, 24/7 Hotline"
                className="bg-white dark:bg-white border-slate-200 text-black"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive" className="text-black cursor-pointer">Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? 'Saving...' : editingNumber ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-white text-black">
          <DialogHeader>
            <DialogTitle>Delete Emergency Number</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 mb-4">
              Are you sure you want to delete this emergency number? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
