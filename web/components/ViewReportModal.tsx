'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { BACKEND_URL, updateComplaint } from '@/lib/api';
import { Complaint, ComplaintStatus, MediaFile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ViewReportModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedComplaint: Complaint) => void;
}

const statusOptions: ComplaintStatus[] = ['OPEN', 'PENDING', 'IN_PROGRESS', 'RESOLVED'];
const severityOptions: Complaint['severity'][] = ['LOW', 'MODERATE', 'HIGH'];

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
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>('OPEN');
  const [severity, setSeverity] = useState<Complaint['severity']>('LOW');
  const [category, setCategory] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isCredible, setIsCredible] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (complaint) {
      setSelectedStatus(complaint.status);
      setSeverity(complaint.severity);
      setCategory(complaint.category || '');
      setRemarks(complaint.remarks || '');
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
        severity,
        category,
        remarks,
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
                Report details
              </DialogTitle>
              <DialogDescription className="text-slate-500 mt-1">
                Manage the complaint without exposing the internal report ID
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
                    <Label htmlFor="report-severity" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Severity
                    </Label>
                    <Select
                      value={severity}
                      onValueChange={(value) => setSeverity(value as Complaint['severity'])}
                    >
                      <SelectTrigger id="report-severity" className="mt-2 bg-white dark:bg-white text-black">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-white text-black">
                        {severityOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="report-status" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </Label>
                     <Select
                       value={selectedStatus}
                       onValueChange={(value) => setSelectedStatus(value as ComplaintStatus)}
                     >
                       <SelectTrigger id="report-status" className="mt-2 bg-white dark:bg-white text-black">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="bg-white dark:bg-white text-black">
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
                    <Label htmlFor="report-category" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Category
                    </Label>
                    <Input
                      id="report-category"
                       className="mt-2 bg-white dark:bg-white text-black dark:text-black"
                      placeholder="e.g. Potholes, Flooding, Fire Hazard, Noise Complaint..."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Free-text category used as additional reference for severity analysis.
                    </p>
                </div>

                <div>
                   <Label htmlFor="report-remarks" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                     Remarks
                   </Label>
                   <textarea
                     id="report-remarks"
                     className="mt-2 w-full rounded-md border border-slate-200 bg-white dark:bg-white p-3 text-sm text-slate-900 dark:text-slate-900 focus:border-blue-500 focus:outline-none"
                     placeholder="Add any additional remarks or observations..."
                     value={remarks}
                     onChange={(e) => setRemarks(e.target.value)}
                     rows={3}
                   />
                   <p className="mt-1 text-xs text-slate-500">
                     Visible to residents on the mobile app.
                   </p>
                </div>
               </div>
            </div>

            {complaint.isFlagged && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-4">
                <h3 className="text-base font-semibold text-slate-950 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>
                  Fraud Detection Flags
                </h3>
                <p className="text-xs text-slate-500">
                  This report was automatically flagged by the fraud detection system.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(complaint.flagType || '').split(',').filter(Boolean).map((flagType: string) => (
                    <span
                      key={flagType}
                      className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20"
                    >
                      {flagType.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                {complaint.flagReason && (
                  <p className="text-sm text-slate-700 bg-white rounded-lg p-3 border border-slate-200">
                    {complaint.flagReason}
                  </p>
                )}
                {complaint.fraudCheck?.flags && Array.isArray(complaint.fraudCheck.flags) && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detection Details</p>
                    <div className="flex flex-wrap gap-2">
                      {complaint.fraudCheck.flags.map((flag: any, idx: number) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                            flag.severity === 'HIGH'
                              ? 'bg-red-50 text-red-700 ring-red-600/20'
                              : flag.severity === 'MEDIUM'
                              ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                              : 'bg-blue-50 text-blue-700 ring-blue-600/20'
                          }`}
                        >
                          {flag.type.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Risk Score: <strong className="text-slate-700">{complaint.fraudCheck.riskScore}/100</strong></span>
                      <span>Checks Run: <strong className="text-slate-700">{complaint.fraudCheck.checksRun?.length || 0}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            )}

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

                  {complaint.address && (
                    <div>
                      <span className="text-xs font-semibold uppercase text-slate-500">
                        Address
                      </span>
                      <p className="mt-1 text-slate-700">
                        {complaint.address}
                      </p>
                    </div>
                  )}

                   {typeof complaint.latitude === 'number' && typeof complaint.longitude === 'number' && (
                     <div>
                       <span className="text-xs font-semibold uppercase text-slate-500">
                         Map View
                       </span>
                       <Button
                         type="button"
                         variant="outline"
                         className="mt-2 w-full justify-center gap-2 border-slate-300 hover:bg-slate-50"
                         onClick={() => router.push('/map')}
                       >
                         Open Map
                       </Button>
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