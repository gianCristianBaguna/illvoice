'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { Textarea } from '@/components/ui/textarea';
import { analyzeComplaintWithAI, updateComplaint } from '@/lib/api';
import { Complaint, ComplaintStatus, SeverityLevel, teamMemberList } from '@/lib/mockData';
import { useState } from 'react';

interface ResolutionModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedComplaint: Complaint) => void;
}

const severityOptions: SeverityLevel[] = ['LOW', 'MODERATE', 'HIGH'];
const statusOptions: ComplaintStatus[] = ['OPEN', 'PENDING', 'IN_PROGRESS', 'RESOLVED']; // include pending for completeness

export function ResolutionModal({ complaint, isOpen, onClose, onSave }: ResolutionModalProps) {
  const [formData, setFormData] = useState<Complaint | null>(complaint);
  const [aiAnalysis, setAiAnalysis] = useState<{
    aiSeverity: string;
    insights: string;
    currentSeverity: string;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen || !complaint) return null;

  const handleChange = (field: keyof Complaint, value: any) => {
    if (formData) {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleSave = async () => {
    if (formData) {
      try {
        // persist changes to backend
        const updated = await updateComplaint(formData);
        onSave(updated);
      } catch (err) {
        console.error('Failed to save complaint:', err);
        // optionally show toast/error message
        onSave(formData); // fallback local update
      }
      onClose();
    }
  };

  const handleAIAnalysis = async () => {
    if (!complaint) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeComplaintWithAI(complaint.id);
      setAiAnalysis(analysis);
    } catch (err) {
      console.error('Failed to analyze with AI:', err);
      // Could show a toast here
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!formData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resolve Complaint #{complaint.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Complaint Details */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Title</Label>
              <p className="text-foreground mt-1">{formData.title}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Description</Label>
              <p className="text-foreground mt-1 text-sm">{formData.description}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Category</Label>
              <p className="text-foreground mt-1">{formData.category}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">Reported By</Label>
                <p className="text-foreground mt-1">{formData.userName}</p>
                <p className="text-xs text-muted-foreground">{formData.userEmail}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Reported Date</Label>
                <p className="text-foreground mt-1">
                  {new Date(formData.reportedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-semibold">AI Analysis</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Get AI Insights'}
              </Button>
            </div>
            
            {aiAnalysis && (
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">AI Suggested Severity:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    aiAnalysis.aiSeverity === 'HIGH' ? 'bg-red-100 text-red-800' :
                    aiAnalysis.aiSeverity === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {aiAnalysis.aiSeverity}
                  </span>
                  {aiAnalysis.aiSeverity !== aiAnalysis.currentSeverity && (
                    <span className="text-xs text-muted-foreground">
                      (Current: {aiAnalysis.currentSeverity})
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium">AI Insights:</span>
                  <p className="text-sm text-muted-foreground mt-1">{aiAnalysis.insights}</p>
                </div>
              </div>
            )}
          </div>

          {/* Status Update */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status" className="text-sm font-semibold">
                  Status
                </Label>
                <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                  <SelectTrigger id="status" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="severity" className="text-sm font-semibold">
                  Severity
                </Label>
                <Select value={formData.severity} onValueChange={(val) => handleChange('severity', val)}>
                  <SelectTrigger id="severity" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {severityOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignedTo" className="text-sm font-semibold">
                  Assign To
                </Label>
                <Select 
                  value={formData.assignedTo || ''} 
                  onValueChange={(val) => handleChange('assignedTo', val)}
                >
                  <SelectTrigger id="assignedTo" className="mt-2">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {teamMemberList.map((member) => (
                      <SelectItem key={member} value={member}>
                        {member}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="deadline" className="text-sm font-semibold">
                  Deadline
                </Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  className="mt-2"
                  value={formData.deadline ? formData.deadline.slice(0, 16) : ''}
                  onChange={(e) => handleChange('deadline', e.target.value ? new Date(e.target.value).toISOString() : '')}
                />
              </div>
            </div>
          </div>

          {/* Resolution Notes */}
          <div className="border-t pt-4">
            <Label htmlFor="notes" className="text-sm font-semibold">
              Resolution Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Add your resolution notes here..."
              className="mt-2 min-h-24"
              value={formData.resolutionNotes || ''}
              onChange={(e) => handleChange('resolutionNotes', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
