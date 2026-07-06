'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { BACKEND_URL, updateComplaint } from '@/lib/api';
import { Complaint, ComplaintStatus, MediaFile } from '@/lib/mockData';
import { useEffect, useState } from 'react';

interface ViewReportModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedComplaint: Complaint) => void;
}

const statusOptions: ComplaintStatus[] = ['OPEN', 'PENDING', 'IN_PROGRESS', 'RESOLVED'];

function getStatusLabel(status: ComplaintStatus) {
  switch (status) {
    case 'OPEN':
      return 'Open';
    case 'PENDING':
      return 'Pending';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'RESOLVED':
      return 'Resolved';
    default:
      return status;
  }
}

function getStatusColor(status: ComplaintStatus) {
  switch (status) {
    case 'OPEN':
    case 'PENDING':
      return 'bg-red-50 text-red-700 ring-red-600/20';
    case 'IN_PROGRESS':
      return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
    case 'RESOLVED':
      return 'bg-green-50 text-green-700 ring-green-600/20';
    default:
      return 'bg-white text-slate-700 ring-slate-600/20';
  }
}

function getSeverityColor(severity: Complaint['severity']) {
  switch (severity) {
    case 'HIGH':
      return 'bg-red-50 text-red-700 ring-red-600/20';
    case 'MODERATE':
      return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
    case 'LOW':
      return 'bg-green-50 text-green-700 ring-green-600/20';
    default:
      return 'bg-white text-slate-700 ring-slate-600/20';
  }
}

function normalizeMediaUrl(url: string) {
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${BACKEND_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

function MediaPreview({ media, index }: { media: MediaFile; index: number }) {
  const [failedToLoad, setFailedToLoad] = useState(false);
  const mediaUrl = normalizeMediaUrl(media.url);

  if (media.type === 'IMAGE') {
    if (failedToLoad) {
      return (
        <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
          Image could not be loaded from the stored source.
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <img
          src={mediaUrl}
          alt={`Attachment ${index + 1}`}
          className="h-44 w-full rounded-lg bg-white object-cover"
          onError={() => setFailedToLoad(true)}
        />
        <p className="text-center text-xs text-slate-500">Image</p>
      </div>
    );
  }

  if (media.type === 'VIDEO') {
    return (
      <div className="space-y-2">
        <video
          src={mediaUrl}
          controls
          className="h-44 w-full rounded-lg bg-black"
        />
        <p className="text-center text-xs text-slate-500">Video</p>
      </div>
    );
  }

  if (media.type === 'AUDIO') {
    return (
      <div className="space-y-2">
        <audio
          controls
          src={mediaUrl}
          className="w-full"
        />
        <p className="text-center text-xs text-slate-500">Audio Recording</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <p className="break-all text-sm text-slate-700">
          {media.url}
        </p>
      </div>
      <p className="text-center text-xs text-slate-500">Text Note</p>
    </div>
  );
}

export function ViewReportModal({
  complaint,
  isOpen,
  onClose,
  onSave,
}: ViewReportModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>('OPEN');
  const [isCredible, setIsCredible] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (complaint) {
      setSelectedStatus(complaint.status);
      setIsCredible(complaint.isCredible || false);
      setErrorMessage(null);
    }
  }, [complaint]);

  if (!isOpen || !complaint) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updated = await updateComplaint({
        id: complaint.id,
        status: selectedStatus,
        isCredible,
      } as Complaint);
      onSave?.(updated);
      onClose();
    } catch (err) {
      console.error('Failed to save report:', err);
      setErrorMessage('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl sm:!max-w-5xl md:!max-w-5xl lg:!max-w-5xl w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto bg-white text-slate-900 p-0 sm:rounded-xl">
         <div className="p-8 border-b border-slate-200">
          <DialogHeader className="flex flex-row items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-950">
                Report #{complaint.id}
              </DialogTitle>
              <DialogDescription className="text-slate-500 mt-1">
                View and manage complaint details
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

         <div className="p-8 space-y-8 max-h-[calc(90vh-180px)] overflow-y-auto">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <h3 className="text-base font-semibold text-slate-950 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>
                Report Details
              </h3>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Title
                  </Label>
                  <p className="mt-1 text-base font-medium text-slate-950">
                    {complaint.title}
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </Label>
                   <p className="mt-1 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap min-h-[80px] max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-4 bg-white">
                    {complaint.description || 'No description provided'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Severity
                    </Label>
                    <span className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getSeverityColor(complaint.severity)}`}>
                      {complaint.severity}
                    </span>
                  </div>

                  <div>
                    <Label htmlFor="report-status" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </Label>
                    <Select
                      value={selectedStatus}
                      onValueChange={(value) => setSelectedStatus(value as ComplaintStatus)}
                    >
                      <SelectTrigger id="report-status" className="mt-2 bg-white text-slate-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-slate-950">
                        {statusOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {getStatusLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Category
                  </Label>
                  <p className="mt-1 text-slate-700">
                    {complaint.category || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <h3 className="text-base font-semibold text-slate-950 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-green-500 rounded-full"></span>
                  Location
                </h3>

                <div>
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Barangay
                  </span>
                  <p className="mt-1 text-slate-700 font-medium">
                    {complaint.barangay || 'Location not recorded'}
                  </p>
                </div>

                {complaint.latitude && complaint.longitude && (
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      Coordinates
                    </span>
                    <p className="mt-1 text-slate-700 font-mono text-sm">
                      {complaint.latitude.toFixed(6)}, {complaint.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <h3 className="text-base font-semibold text-slate-950 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-purple-500 rounded-full"></span>
                  Reported By
                </h3>

                <div>
                  <span className="text-xs font-semibold uppercase text-slate-500">Name</span>
                  <p className="mt-1 text-slate-700 font-medium">{complaint.userName}</p>
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase text-slate-500">Email</span>
                  <p className="mt-1 text-slate-700 text-sm break-all">{complaint.userEmail}</p>
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase text-slate-500">Reported</span>
                  <p className="mt-1 text-slate-700 text-sm">
                    {new Date(complaint.reportedDate).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {complaint.status === 'RESOLVED' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <h3 className="text-base font-semibold text-slate-950 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span>
                Resolution Details
              </h3>

              {complaint.resolvedBy && (
                <div>
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Resolved By
                  </span>
                  <p className="mt-1 text-slate-700 font-medium">{complaint.resolvedBy}</p>
                </div>
              )}

              {complaint.resolutionNotes && (
                <div>
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Notes
                  </span>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {complaint.resolutionNotes}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-7">
            <h3 className="mb-4 text-base font-semibold text-slate-950 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>
              Multimedia Attachments
            </h3>

            {complaint.multimedia && complaint.multimedia.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {complaint.multimedia.map((media, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <MediaPreview media={media} index={idx} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No multimedia attachments available.
              </p>
            )}
          </div>
        </div>

         {errorMessage && (
           <div className="mx-8 mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 border border-red-100">
             {errorMessage}
           </div>
         )}

         <div className="p-8 border-t border-slate-200 bg-white">
           <div className="flex items-center space-x-3 mb-4">
            <Checkbox
              id="isCredible"
              checked={isCredible}
              onCheckedChange={(checked) => setIsCredible(checked === true)}
              className="border-slate-300"
            />
            <Label htmlFor="isCredible" className="text-sm font-medium cursor-pointer text-slate-700">
              Mark as Credible Report
            </Label>
          </div>
          <p className="text-xs text-slate-500">
            When checked, this report counts toward the users credibility score.
            Credibility = (credible resolved reports / total resolved reports) × 100%
          </p>
        </div>

         <DialogFooter className="p-8 pt-6 border-t border-slate-200">
          <div className="flex gap-3 w-full justify-end">
            <Button variant="outline" onClick={onClose} disabled={isSaving} className="border-slate-300">
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}