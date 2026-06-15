

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Complaint } from '@/lib/mockData';

interface ViewReportModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ViewReportModal({
  complaint,
  isOpen,
  onClose,
}: ViewReportModalProps) {
  if (!isOpen || !complaint) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            Report #{complaint.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Report Details */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white">
              Report Details
            </h3>

            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-400">
                Title
              </Label>
              <p className="mt-1 text-base font-medium text-white">
                {complaint.title}
              </p>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-400">
                Description
              </Label>
              <p className="mt-1 text-sm leading-relaxed text-gray-200">
                {complaint.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-gray-400">
                  Severity
                </Label>
                <p className="mt-1 font-medium text-white">
                  {complaint.severity}
                </p>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide text-gray-400">
                  Status
                </Label>
                <p className="mt-1 font-medium text-white">
                  {complaint.status}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-400">
                Category
              </Label>
              <p className="mt-1 text-white">
                {complaint.category || 'N/A'}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
            <h3 className="text-lg font-semibold text-white">Location</h3>

            <div>
              <span className="text-xs uppercase text-gray-500">
                Barangay
              </span>
              <p className="mt-1 text-gray-100">
                {complaint.barangay || 'Unknown'}
              </p>
            </div>

            {complaint.latitude && complaint.longitude && (
              <div>
                <span className="text-xs uppercase text-gray-500">
                  Coordinates
                </span>
                <p className="mt-1 text-gray-100">
                  {complaint.latitude.toFixed(6)},{' '}
                  {complaint.longitude.toFixed(6)}
                </p>
              </div>
            )}
          </div>

          {/* Reporter */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
            <h3 className="text-lg font-semibold text-white">
              Reported By
            </h3>

            <div>
              <span className="text-xs uppercase text-gray-500">Name</span>
              <p className="mt-1 text-gray-100">{complaint.userName}</p>
            </div>

            <div>
              <span className="text-xs uppercase text-gray-500">Email</span>
              <p className="mt-1 text-gray-100">{complaint.userEmail}</p>
            </div>

            <div>
              <span className="text-xs uppercase text-gray-500">Reported</span>
              <p className="mt-1 text-gray-100">
                {new Date(complaint.reportedDate).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Resolution */}
          {complaint.status === 'RESOLVED' && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <h3 className="text-lg font-semibold text-white">
                Resolution Details
              </h3>

              {complaint.resolvedBy && (
                <div>
                  <span className="text-xs uppercase text-gray-500">
                    Resolved By
                  </span>
                  <p className="mt-1 text-gray-100">
                    {complaint.resolvedBy}
                  </p>
                </div>
              )}

              {complaint.resolutionNotes && (
                <div>
                  <span className="text-xs uppercase text-gray-500">
                    Notes
                  </span>

                  <div className="mt-2 rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm leading-relaxed text-gray-200">
                    {complaint.resolutionNotes}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Multimedia */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="mb-4 text-lg font-semibold text-white">
              Multimedia Attachments
            </h3>

            {complaint.multimedia && complaint.multimedia.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {complaint.multimedia.map((media, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-zinc-700 bg-zinc-950 p-3"
                  >
                    {media.type === 'IMAGE' && (
                      <div className="space-y-2">
                        <img
                          src={media.url}
                          alt={`Attachment ${idx + 1}`}
                          className="h-44 w-full rounded-lg object-cover"
                        />
                        <p className="text-center text-xs text-gray-500">
                          Image
                        </p>
                      </div>
                    )}

                    {media.type === 'VIDEO' && (
                      <div className="space-y-2">
                        <video
                          src={media.url}
                          controls
                          className="h-44 w-full rounded-lg bg-black"
                        />
                        <p className="text-center text-xs text-gray-500">
                          Video
                        </p>
                      </div>
                    )}

                    {media.type === 'AUDIO' && (
                      <div className="space-y-2">
                        <audio
                          controls
                          src={media.url}
                          className="w-full"
                        />
                        <p className="text-center text-xs text-gray-500">
                          Audio Recording
                        </p>
                      </div>
                    )}

                    {media.type === 'TEXT' && (
                      <div className="space-y-2">
                        <div className="rounded-md border border-zinc-700 bg-zinc-900 p-3">
                          <p className="break-all text-sm text-gray-200">
                            {media.url}
                          </p>
                        </div>

                        <p className="text-center text-xs text-gray-500">
                          Text Note
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No multimedia attachments available.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
