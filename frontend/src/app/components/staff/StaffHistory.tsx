import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, Star, TrendingUp, Loader, History } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Complaint } from '../../types';
import complaintService from '../../../services/complaintService';
import { complaintCategoryLabel } from '../../utils/complaintCategoryLabel';
import { cn } from '../ui/utils';

export function StaffHistory() {
  const { currentUser } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadResolvedComplaints = async () => {
      try {
        const allComplaints = await complaintService.getAllComplaints();
        setComplaints(allComplaints);
      } catch (error) {
        console.error('Failed to load complaints:', error);
        setComplaints([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadResolvedComplaints();
  }, []);

  const currentUserId = Number(currentUser?.userId || currentUser?.id || 0);

  const resolved = complaints.filter(
    c =>
      (c.assignedStaffId === currentUserId || c.assignedStaffId?.toString() === currentUser?.id) &&
      (c.status === 'Resolved' || c.status === 'resolved')
  );

  const totalRated = resolved.filter(c => c.rating);
  const avgRating =
    totalRated.length > 0
      ? (totalRated.reduce((s, c) => s + (c.rating ?? 0), 0) / totalRated.length).toFixed(1)
      : null;

  const fiveStar = resolved.filter(c => c.rating === 5).length;

  const summaryBlocks = [
    {
      label: 'Total Resolved',
      value: resolved.length,
      icon: CheckCircle2,
      iconWrap: 'bg-amber-500/25 text-amber-200',
    },
    {
      label: 'Avg. Rating',
      value: avgRating ?? '—',
      icon: Star,
      iconWrap: 'bg-violet-500/20 text-violet-200',
    },
    {
      label: '5-Star Ratings',
      value: fiveStar,
      icon: TrendingUp,
      iconWrap: 'bg-amber-500/20 text-amber-300',
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:h-full md:overflow-hidden">
      <div className="shrink-0 border-b border-amber-500/15 bg-gradient-to-br from-slate-950/90 via-violet-950/25 to-amber-950/30 px-4 py-6 backdrop-blur sm:px-8 sm:py-8">
        <p className="mb-1.5 flex items-center gap-2 text-xs font-medium tracking-wide text-amber-200/75">
          <History className="h-3.5 w-3.5 text-amber-400/90" />
          Staff workspace
        </p>
        <h1 className="text-2xl text-white sm:text-3xl" style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
          Resolution history
        </h1>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/55">
          Your track record of resolved complaints — ratings and volume at a glance.
        </p>
      </div>

      <div className="px-4 py-6 sm:px-8 sm:py-8 md:min-h-0 md:flex-1 md:overflow-y-auto">
        <div className="mx-auto max-w-6xl lg:max-w-none">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader className="mb-4 h-8 w-8 animate-spin text-amber-400/50" />
              <p className="text-sm text-white/50">Loading resolution history…</p>
            </div>
          ) : (
            <>
              {/* Match StaffDashboard stat tile styling (non-interactive) */}
              <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {summaryBlocks.map(block => {
                  const Icon = block.icon;
                  return (
                    <div
                      key={block.label}
                      className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-4 sm:px-4 sm:py-4"
                    >
                      <div
                        className={cn(
                          'mb-2 flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9',
                          block.iconWrap
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <p className="text-xl text-white sm:text-2xl" style={{ fontWeight: 700 }}>
                        {block.value}
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/50 sm:text-xs">{block.label}</p>
                    </div>
                  );
                })}
              </div>

              {resolved.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-500/15 bg-slate-950/35 py-20 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-950/40">
                    <CheckCircle2 className="h-6 w-6 text-amber-400/45" />
                  </div>
                  <p className="mb-1 text-sm text-white/70" style={{ fontWeight: 600 }}>
                    No resolved complaints yet
                  </p>
                  <p className="max-w-xs text-sm text-white/45">Your resolved cases will appear here.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {resolved.map(complaint => (
                    <li
                      key={complaint.id}
                      className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-4 sm:px-5 sm:py-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="inline-block rounded-full border border-amber-500/20 bg-white/[0.06] px-2 py-0.5 text-xs text-amber-50/90">
                            {complaintCategoryLabel(complaint)}
                          </span>
                          <p className="mt-2 text-sm text-white" style={{ fontWeight: 600 }}>
                            {complaint.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-white/55">{complaint.description}</p>
                        </div>

                        {complaint.rating && (
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star
                                  key={s}
                                  className={`h-3.5 w-3.5 ${s <= complaint.rating! ? 'fill-amber-400 text-amber-400' : 'text-white/20'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-white/50">{complaint.rating}/5</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/50">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Resolved{' '}
                          {complaint.resolvedAt
                            ? new Date(complaint.resolvedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          Customer: {complaint.createdByName || complaint.userName || 'Unknown'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
