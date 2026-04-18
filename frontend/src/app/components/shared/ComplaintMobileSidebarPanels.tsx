import { useNavigate } from 'react-router';
import { AlertCircle, ArrowLeft, Calendar, Lightbulb, Star, Tag, User } from 'lucide-react';
import type { Complaint } from '../../types';
import { complaintCategoryLabel } from '../../utils/complaintCategoryLabel';

const userStatusConfig: Record<string, { label: string; className: string; dot: string }> = {
  open: { label: 'Pending Review', className: 'bg-red-50 text-red-600 border border-red-100', dot: 'bg-red-500' },
  Open: { label: 'Pending Review', className: 'bg-red-50 text-red-600 border border-red-100', dot: 'bg-red-500' },
  assigned: { label: 'In Progress', className: 'bg-amber-50 text-amber-600 border border-amber-100', dot: 'bg-amber-500' },
  'In Progress': { label: 'In Progress', className: 'bg-amber-50 text-amber-600 border border-amber-100', dot: 'bg-amber-500' },
  resolved: { label: 'Resolved', className: 'bg-white/10 text-white/60 border border-white/20', dot: 'bg-white/40' },
  Resolved: { label: 'Resolved', className: 'bg-white/10 text-white/60 border border-white/20', dot: 'bg-white/40' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-500 border border-red-100', dot: 'bg-red-400' },
  Cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-500 border border-red-100', dot: 'bg-red-400' },
};

const staffStatusConfig: Record<string, { label: string; className: string; dot: string }> = {
  open: { label: 'Pending', className: 'bg-red-50 text-red-600 border border-red-100', dot: 'bg-red-500' },
  Open: { label: 'Pending', className: 'bg-red-50 text-red-600 border border-red-100', dot: 'bg-red-500' },
  assigned: { label: 'In Progress', className: 'bg-amber-50 text-amber-600 border border-amber-100', dot: 'bg-amber-500' },
  'In Progress': { label: 'In Progress', className: 'bg-amber-50 text-amber-600 border border-amber-100', dot: 'bg-amber-500' },
  resolved: { label: 'Resolved', className: 'bg-white/10 text-white/60 border border-white/20', dot: 'bg-white/40' },
  Resolved: { label: 'Resolved', className: 'bg-white/10 text-white/60 border border-white/20', dot: 'bg-white/40' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-500 border border-red-100', dot: 'bg-red-400' },
  Cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-500 border border-red-100', dot: 'bg-red-400' },
};

function userPri(p?: string) {
  if (p === 'Critical') return 'bg-red-600 text-white';
  if (p === 'High') return 'bg-red-500/20 text-red-300';
  if (p === 'Medium') return 'bg-amber-500/20 text-amber-300';
  return 'bg-white/10 text-white/60';
}

function staffPri(p?: string) {
  if (p === 'Critical') return 'bg-red-600 text-white';
  if (p === 'High') return 'bg-red-50 text-red-600';
  if (p === 'Medium') return 'bg-amber-50 text-amber-600';
  return 'bg-white/10 text-white/60';
}

/** Compact complaint summary for small screens — rendered inside complaint view only (e.g. collapsible). */
export function UserComplaintMobileSidebarPanel({ complaint }: { complaint: Complaint }) {
  const navigate = useNavigate();
  const status = userStatusConfig[complaint.status] || userStatusConfig.open;
  const pendingOpen = complaint.status === 'Open' || complaint.status === 'open';

  return (
    <div className="space-y-3 text-xs">
      <button
        type="button"
        onClick={() => navigate('/user/dashboard')}
        className="flex items-center gap-1.5 text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Dashboard
      </button>

      <div className="flex flex-wrap gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${status.className}`} style={{ fontWeight: 600 }}>
          <span className={`h-1 w-1 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
          {complaintCategoryLabel(complaint)}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] ${userPri(complaint.priority)}`} style={{ fontWeight: 600 }}>
          {complaint.priority}
        </span>
      </div>

      <h3 className="text-sm font-bold leading-tight text-white">{complaint.title}</h3>

      <div className="space-y-1 text-[11px] text-white/60">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 shrink-0" />
          {complaint.createdAt &&
            new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        {complaint.assignedStaffName && (
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 shrink-0" />
            Handled by <span className="text-white" style={{ fontWeight: 500 }}>{complaint.assignedStaffName}</span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-white/20 bg-white/10 p-3 text-white/75">
        <div className="mb-1 flex items-center gap-1 text-[10px] text-white/50">
          <Tag className="h-3 w-3" />
          Original complaint description
        </div>
        <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-white/90">{complaint.description}</p>
      </div>

      {pendingOpen && (
        <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
          <p className="text-[11px] leading-snug text-red-700">Your complaint is pending assignment. A staff member will be assigned shortly.</p>
        </div>
      )}
    </div>
  );
}

export function StaffComplaintMobileSidebarPanel({ complaint }: { complaint: Complaint }) {
  const navigate = useNavigate();
  const status = staffStatusConfig[complaint.status] || staffStatusConfig.open;
  const showTip = complaint.status !== 'Resolved' && complaint.status !== 'resolved';
  const showRating = complaint.rating != null;

  return (
    <div className="space-y-3 text-xs">
      <button
        type="button"
        onClick={() => navigate('/staff/dashboard')}
        className="flex items-center gap-1.5 text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Dashboard
      </button>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${status.className}`} style={{ fontWeight: 600 }}>
            <span className={`h-1 w-1 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
            {complaintCategoryLabel(complaint)}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${staffPri(complaint.priority)}`} style={{ fontWeight: 600 }}>
            {complaint.priority}
          </span>
        </div>
        {showRating && (
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-amber-100 bg-amber-50 px-2 py-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-[11px] text-amber-700" style={{ fontWeight: 600 }}>
              {complaint.rating}/5
            </span>
          </div>
        )}
      </div>

      <h3 className="text-sm font-bold leading-tight text-white">{complaint.title}</h3>

      <div className="space-y-1 text-[11px] text-white/60">
        <div className="flex items-center gap-1.5">
          <User className="h-3 w-3 shrink-0" />
          Submitted by{' '}
          <span className="text-white" style={{ fontWeight: 500 }}>
            {complaint.createdByName || complaint.userName || 'Unknown'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 shrink-0" />
          {complaint.createdAt &&
            new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div className="rounded-lg border border-white/20 bg-white/10 p-3">
        <div className="mb-1 flex items-center gap-1 text-[10px] text-white/50">
          <Tag className="h-3 w-3" />
          Original complaint description
        </div>
        <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-white/90">{complaint.description}</p>
      </div>

      {showTip && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <p className="text-[11px] leading-snug text-amber-200/90">
            Use the <span style={{ fontWeight: 600 }}>Solution Proposal</span> toggle when sending a message that resolves the issue.
          </p>
        </div>
      )}
    </div>
  );
}
