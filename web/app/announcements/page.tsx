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
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  updateAnnouncement,
} from '@/lib/api'
import type { Announcement } from '@/lib/api'
import { Megaphone, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'NORMAL',
    targetAudience: 'ALL',
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const { isAuthenticated, adminRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    loadAnnouncements()
  }, [isAuthenticated, router])

  const loadAnnouncements = async () => {
    try {
      const data = await fetchAnnouncements()
      setAnnouncements(data)
    } catch (err) {
      console.error('Error fetching announcements:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement)
      setFormData({
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        targetAudience: announcement.targetAudience,
        isActive: announcement.isActive,
      })
    } else {
      setEditingAnnouncement(null)
      setFormData({
        title: '',
        content: '',
        priority: 'NORMAL',
        targetAudience: 'ALL',
        isActive: true,
      })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, formData)
        toast.success('Announcement updated successfully')
      } else {
        await createAnnouncement(formData)
        toast.success('Announcement created successfully')
      }
      setDialogOpen(false)
      loadAnnouncements()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save announcement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingAnnouncement) return
    try {
      await deleteAnnouncement(editingAnnouncement.id)
      toast.success('Announcement deleted successfully')
      setDeleteOpen(false)
      setEditingAnnouncement(null)
      loadAnnouncements()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete announcement')
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <Badge className="bg-red-600 text-white hover:bg-red-700">Urgent</Badge>
      case 'HIGH':
        return <Badge className="bg-orange-500 text-white hover:bg-orange-600">High</Badge>
      case 'LOW':
        return <Badge className="bg-green-600 text-white hover:bg-green-700">Low</Badge>
      default:
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">Normal</Badge>
    }
  }

  const getAudienceBadge = (audience: string) => {
    switch (audience) {
      case 'RESIDENT':
        return <Badge variant="outline" className="text-black border-black">Resident</Badge>
      case 'BARANGAY_OFFICIAL':
        return <Badge variant="outline" className="text-black border-black">Barangay Official</Badge>
      case 'ADMIN':
        return <Badge variant="outline" className="text-black border-black">Admin</Badge>
      default:
        return <Badge variant="outline" className="text-black border-black">All</Badge>
    }
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
                <h1 className="text-xl md:text-2xl font-bold text-black">Announcements</h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  Manage community announcements and updates
                </p>
              </div>
              <Button onClick={() => handleOpenDialog()} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus size={16} />
                <span className="hidden sm:inline">New Announcement</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="px-3 py-4 md:px-6 md:py-6">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-slate-600">Loading announcements...</div>
              </div>
            ) : announcements.length === 0 ? (
              <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
                <CardContent className="p-12 text-center">
                  <Megaphone size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-black mb-2">No announcements yet</h3>
                  <p className="text-sm text-slate-500 mb-4">Create your first announcement to notify the community</p>
                  <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus size={16} className="mr-2" />
                    Create Announcement
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {announcements.map((announcement) => (
                  <Card key={announcement.id} className="rounded-xl border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {getPriorityBadge(announcement.priority)}
                            {getAudienceBadge(announcement.targetAudience)}
                            {!announcement.isActive && (
                              <Badge variant="outline" className="text-slate-500 border-slate-300">Inactive</Badge>
                            )}
                          </div>
                          <h3 className="text-base md:text-lg font-semibold text-black mb-1">{announcement.title}</h3>
                          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{announcement.content}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>
                              {new Date(announcement.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {announcement.createdBy && (
                              <span>By {announcement.createdBy.name || announcement.createdBy.email}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex md:flex-col gap-2 md:ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(announcement)}
                            className="flex-1 md:flex-none"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setEditingAnnouncement(announcement)
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-black">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Announcement title"
                required
                className="bg-white border-slate-200 text-black"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="content" className="text-black">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Announcement content"
                required
                className="bg-white border-slate-200 text-black min-h-[120px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="priority" className="text-black">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger id="priority" className="bg-white border-slate-200 text-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="audience" className="text-black">Target Audience</Label>
                <Select value={formData.targetAudience} onValueChange={(value) => setFormData(prev => ({ ...prev, targetAudience: value }))}>
                  <SelectTrigger id="audience" className="bg-white border-slate-200 text-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="RESIDENT">Resident</SelectItem>
                    <SelectItem value="BARANGAY_OFFICIAL">Barangay Official</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label htmlFor="isActive" className="text-black cursor-pointer">Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? 'Saving...' : editingAnnouncement ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 mb-4">
              Are you sure you want to delete this announcement? This action cannot be undone.
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
