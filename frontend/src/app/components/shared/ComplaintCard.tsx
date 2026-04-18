import { Complaint } from '../../types';
import { complaintCategoryLabel } from '../../utils/complaintCategoryLabel';
import { cn } from '../ui/utils';
import { Clock, CheckCircle2, AlertCircle, ChevronRight, Calendar, User, XCircle, ArrowRightLeft } from 'lucide-react';
import BorderGlow from '../../../components/BorderGlow';

interface ComplaintCardProps {
  complaint: Complaint;
  onClick?: () => void;
  showAssignment?: boolean;
  showUser?: boolean;
  unreadMessageCount?: number;
  /** user = teal personal tracker; staff = amber/violet workbench; default = admin list */
  variant?: 'default' | 'user' | 'staff';
  /** One-shot border sweep on mount (use only for the first card in a list) */
  playIntroGlow?: boolean;
  /** If set, renders a violet 'Transferred from {name}' badge */
  transferredByName?: string;
}

const statusConfig: Record<string, any> = {
  'open': {
    icon: AlertCircle,
    label: 'Pending',
    className: 'bg-red-50 text-red-600 border border-red-100',
    dot: 'bg-red-500',
  },
  'Open': {
    icon: AlertCircle,
    label: 'Pending',
    className: 'bg-red-50 text-red-600 border border-red-100',
    dot: 'bg-red-500',
  },
  'assigned': {
    icon: Clock,
    label: 'In Progress',
    className: 'bg-amber-50 text-amber-600 border border-amber-100',
    dot: 'bg-amber-500',
  },
  'In Progress': {
    icon: Clock,
    label: 'In Progress',
    className: 'bg-amber-50 text-amber-600 border border-amber-100',
    dot: 'bg-amber-500',
  },
  'resolved': {
    icon: CheckCircle2,
    label: 'Resolved',
    className: 'bg-white/10 text-white/60 border border-white/20',
    dot: 'bg-white/40',
  },
  'Resolved': {
    icon: CheckCircle2,
    label: 'Resolved',
    className: 'bg-white/10 text-white/60 border border-white/20',
    dot: 'bg-white/40',
  },
  'cancelled': {
    icon: XCircle,
    label: 'Cancelled',
    className: 'bg-red-50 text-red-500 border border-red-100',
    dot: 'bg-red-300',
  },
  'Cancelled': {
    icon: XCircle,
    label: 'Cancelled',
    className: 'bg-red-50 text-red-500 border border-red-100',
    dot: 'bg-red-300',
  },
};

const priorityConfig = {
  Low: { className: 'bg-white/10 text-white/60', border: 'border-l-white/20' },
  Medium: { className: 'bg-amber-50 text-amber-600', border: 'border-l-amber-300' },
  High: { className: 'bg-red-50 text-red-600', border: 'border-l-red-400' },
  Critical: { className: 'bg-red-600 text-white', border: 'border-l-red-600' },
};

const priorityConfigUser = {
  Low: { className: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/25', border: 'border-l-emerald-400' },
  Medium: { className: 'bg-amber-500/20 text-amber-200 border border-amber-500/25', border: 'border-l-amber-400' },
  High: { className: 'bg-orange-500/20 text-orange-200 border border-orange-500/25', border: 'border-l-orange-400' },
  Critical: { className: 'bg-red-600/35 text-red-100 border border-red-500/30', border: 'border-l-red-500' },
};

const statusConfigUser: Record<string, { icon: typeof AlertCircle; label: string; className: string; dot: string }> = {
  open: {
    icon: AlertCircle,
    label: 'Pending',
    className: 'bg-rose-500/15 text-rose-200 border border-rose-500/25',
    dot: 'bg-rose-400',
  },
  Open: {
    icon: AlertCircle,
    label: 'Pending',
    className: 'bg-rose-500/15 text-rose-200 border border-rose-500/25',
    dot: 'bg-rose-400',
  },
  assigned: {
    icon: Clock,
    label: 'In progress',
    className: 'bg-teal-500/15 text-teal-200 border border-teal-500/25',
    dot: 'bg-teal-400',
  },
  'In Progress': {
    icon: Clock,
    label: 'In progress',
    className: 'bg-teal-500/15 text-teal-200 border border-teal-500/25',
    dot: 'bg-teal-400',
  },
  resolved: {
    icon: CheckCircle2,
    label: 'Resolved',
    className: 'bg-slate-500/20 text-slate-200 border border-white/15',
    dot: 'bg-slate-400',
  },
  Resolved: {
    icon: CheckCircle2,
    label: 'Resolved',
    className: 'bg-slate-500/20 text-slate-200 border border-white/15',
    dot: 'bg-slate-400',
  },
};

const priorityConfigStaff = priorityConfigUser;

const statusConfigStaff: Record<string, { icon: typeof AlertCircle; label: string; className: string; dot: string }> = {
  open: {
    icon: AlertCircle,
    label: 'Pending',
    className: 'bg-amber-500/18 text-amber-100 border border-amber-500/30',
    dot: 'bg-amber-400',
  },
  Open: {
    icon: AlertCircle,
    label: 'Pending',
    className: 'bg-amber-500/18 text-amber-100 border border-amber-500/30',
    dot: 'bg-amber-400',
  },
  assigned: {
    icon: Clock,
    label: 'In progress',
    className: 'bg-violet-500/18 text-violet-100 border border-violet-500/30',
    dot: 'bg-violet-400',
  },
  'In Progress': {
    icon: Clock,
    label: 'In progress',
    className: 'bg-violet-500/18 text-violet-100 border border-violet-500/30',
    dot: 'bg-violet-400',
  },
  resolved: {
    icon: CheckCircle2,
    label: 'Resolved',
    className: 'bg-slate-500/22 text-slate-100 border border-white/12',
    dot: 'bg-slate-400',
  },
  Resolved: {
    icon: CheckCircle2,
    label: 'Resolved',
    className: 'bg-slate-500/22 text-slate-100 border border-white/12',
    dot: 'bg-slate-400',
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelled',
    className: 'bg-white/8 text-white/55 border border-white/15',
    dot: 'bg-white/35',
  },
  Cancelled: {
    icon: XCircle,
    label: 'Cancelled',
    className: 'bg-white/8 text-white/55 border border-white/15',
    dot: 'bg-white/35',
  },
};

export function ComplaintCard({
  complaint,
  onClick,
  showAssignment = false,
  showUser = false,
  unreadMessageCount = 0,
  variant = 'default',
  playIntroGlow = false,
  transferredByName,
}: ComplaintCardProps) {
  const statusMap =
    variant === 'user' ? statusConfigUser : variant === 'staff' ? statusConfigStaff : statusConfig;
  const status =
    statusMap[complaint.status] ||
    (variant === 'staff' ? statusConfigStaff['open'] : statusMap['open']) ||
    statusConfig['open'];
  const priorityMap =
    variant === 'user' || variant === 'staff' ? priorityConfigStaff : priorityConfig;
  const priority = priorityMap[complaint.priority as keyof typeof priorityMap] || priorityMap['Medium'];

  const isUser = variant === 'user';
  const isStaff = variant === 'staff';

  const meshColors =
    variant === 'user'
      ? ['#2dd4bf', '#818cf8', '#38bdf8']
      : isStaff
        ? ['#f59e0b', '#a78bfa', '#fb923c']
        : ['#fbbf24', '#f87171'];

  const interactive = Boolean(onClick);

  return (
    <BorderGlow
      colors={meshColors}
      borderRadius={12}
      fillOpacity={isUser ? 0.14 : isStaff ? 0.15 : 0.25}
      glowRadius={isUser ? 42 : isStaff ? 44 : 50}
      glowIntensity={isUser ? 0.75 : isStaff ? 0.82 : 1.2}
      coneSpread={isUser ? 52 : isStaff ? 54 : 60}
      animated={playIntroGlow}
      className={cn(
        'backdrop-blur rounded-xl transition-all border',
        isUser
          ? 'bg-slate-950/40 border-teal-500/15 hover:border-teal-400/25'
          : isStaff
            ? 'bg-slate-950/45 border-amber-500/18 hover:border-violet-400/28'
            : 'bg-white/10 border-white/20',
        interactive &&
          (isUser
            ? 'hover:bg-slate-900/50'
            : isStaff
              ? 'hover:bg-slate-900/55'
              : 'hover:bg-white/20')
      )}
    >
      {/* One hit target for the whole card so clicks + TargetCursor wrap the full area */}
      <div
        className={cn(
          'relative z-10 flex flex-col p-5',
          interactive &&
            'cursor-target cursor-pointer rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-white/25'
        )}
        onClick={onClick}
        onKeyDown={e => {
          if (!onClick) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs',
                  isUser && 'border-white/10 bg-white/[0.06] text-slate-200',
                  isStaff && 'border-amber-500/20 bg-white/[0.06] text-amber-50/90',
                  !isUser && !isStaff && 'border-white/20 bg-white/10 text-white/60'
                )}
              >
                {complaintCategoryLabel(complaint)}
              </span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs', priority.className)}>
                {complaint.priority || 'Medium'}
              </span>
              {transferredByName && (
                <span className="flex items-center gap-1 rounded-full bg-violet-500/20 text-violet-200 border border-violet-500/25 px-2 py-0.5 text-xs">
                  <ArrowRightLeft className="h-3 w-3" />
                  Transferred from {transferredByName}
                </span>
              )}
            </div>
            <h3 className="truncate text-white" style={{ fontWeight: 600 }}>
              {complaint.title}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-white/60">{complaint.description}</p>
          </div>
          <div className="mt-1 flex flex-shrink-0 items-center gap-2">
            {unreadMessageCount > 0 && (
              <span
                aria-label={`${unreadMessageCount} unread message${unreadMessageCount > 1 ? 's' : ''}`}
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] text-white"
                style={{ fontWeight: 700 }}
              >
                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
              </span>
            )}
            {interactive && <ChevronRight className="h-4 w-4 text-white/40" />}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs', status?.className)}>
            <div className={cn('h-1.5 w-1.5 rounded-full', status?.dot)} />
            {status?.label}
          </div>

          <div className="flex items-center gap-1 text-xs text-white/60">
            <Calendar className="h-3 w-3" />
            {complaint.createdAt
              ? new Date(complaint.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—'}
          </div>

          {showUser && (
            <div className="flex items-center gap-1 text-xs text-white/60">
              <User className="h-3 w-3" />
              {complaint.createdByName || complaint.userName || 'Unknown'}
            </div>
          )}

          {showAssignment && complaint.assignedStaffName && (
            <div className="ml-auto flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/60">
              <User className="h-3 w-3" />
              {complaint.assignedStaffName}
            </div>
          )}

          {complaint.rating && (
            <div className="ml-auto flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={i < complaint.rating! ? 'text-amber-400' : 'text-white/20'}
                  style={{ fontSize: '10px' }}
                >
                  ★
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </BorderGlow>
  );
}
