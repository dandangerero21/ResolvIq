import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ComplaintCard } from '../shared/ComplaintCard';
import { ComplaintSortSelect } from '../shared/ComplaintSortSelect';
import BorderGlow from '../../../components/BorderGlow';
import complaintService from '../../../services/complaintService';
import messageService from '../../../services/messageService';
import { getConversationUnreadCount } from '../../../services/conversationUnreadService';
import { Complaint } from '../../types';
import { sortComplaints, type ComplaintSortKey } from '../../utils/complaintSort';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Star,
  MessageSquare,
  XCircle,
  Headphones,
  History,
  Loader,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '../ui/utils';

type TabKey = 'active' | 'resolved' | 'cancelled';

export function StaffDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { complaints: contextComplaints } = useApp();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [sortBy, setSortBy] = useState<ComplaintSortKey>('newest');
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    const loadComplaints = async () => {
      try {
        const data = await complaintService.getAllComplaints();
        setComplaints(data);
      } catch (error) {
        console.error('Failed to load complaints:', error);
        setComplaints(contextComplaints);
      } finally {
        setIsLoading(false);
      }
    };
    loadComplaints();
  }, []);

  const displayComplaints = complaints.length > 0 ? complaints : contextComplaints;

  const assigned = displayComplaints.filter(c => {
    const complaintStaffId = c.assignedStaffId?.toString();
    const currentUserId = currentUser?.userId?.toString() || currentUser?.id?.toString();
    return complaintStaffId === currentUserId;
  });

  useEffect(() => {
    const viewerUserId = Number(currentUser?.userId ?? currentUser?.id)
    if (!Number.isFinite(viewerUserId)) {
      setUnreadCounts({})
      return
    }

    const complaintIds = Array.from(
      new Set(
        displayComplaints
          .filter(complaint => complaint.assignedStaffId?.toString() === String(viewerUserId))
          .map(complaint => complaint.complaintId ?? Number(complaint.id))
          .filter((complaintId): complaintId is number => Number.isFinite(complaintId))
      )
    )

    if (complaintIds.length === 0) {
      setUnreadCounts({})
      return
    }

    let isMounted = true

    const refreshUnreadCounts = async () => {
      const unreadEntries = await Promise.all(
        complaintIds.map(async complaintId => {
          try {
            const messages = await messageService.getComplaintMessages(complaintId)
            const unreadCount = getConversationUnreadCount({
              complaintId,
              viewerRole: 'staff',
              viewerUserId,
              messages,
            })
            return [complaintId, unreadCount] as const
          } catch (error) {
            console.error(`Failed to load unread count for complaint ${complaintId}:`, error)
            return [complaintId, 0] as const
          }
        })
      )

      if (!isMounted) {
        return
      }

      setUnreadCounts(Object.fromEntries(unreadEntries))
    }

    void refreshUnreadCounts()
    const interval = setInterval(() => {
      void refreshUnreadCounts()
    }, 4000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [currentUser?.userId, currentUser?.id, displayComplaints])

  const active = assigned.filter(
    c =>
      c.status !== 'Resolved' &&
      c.status !== 'resolved' &&
      c.status !== 'Cancelled' &&
      c.status !== 'cancelled'
  );
  const resolved = assigned.filter(c => c.status === 'Resolved' || c.status === 'resolved');
  const cancelledComplaints = assigned.filter(c => c.status === 'Cancelled' || c.status === 'cancelled');

  const avgRating =
    resolved.filter(c => c.rating).length > 0
      ? (
          resolved.filter(c => c.rating).reduce((sum, c) => sum + (c.rating ?? 0), 0) /
          resolved.filter(c => c.rating).length
        ).toFixed(1)
      : '—';

  /* Avg. Rating last (rightmost on lg) — same filter behavior as before */
  const statsCards = [
    {
      label: 'Total Assigned',
      value: assigned.length,
      icon: ClipboardList,
      filterKey: 'active' as TabKey,
    },
    {
      label: 'Active Cases',
      value: active.length,
      icon: Clock,
      filterKey: 'active' as TabKey,
    },
    {
      label: 'Resolved',
      value: resolved.length,
      icon: CheckCircle2,
      filterKey: 'resolved' as TabKey,
    },
    {
      label: 'Cancelled',
      value: cancelledComplaints.length,
      icon: XCircle,
      filterKey: 'cancelled' as TabKey,
    },
    {
      label: 'Avg. Rating',
      value: avgRating,
      icon: Star,
      filterKey: 'active' as TabKey,
    },
  ];

  const displayed = activeTab === 'active' ? active : activeTab === 'resolved' ? resolved : cancelledComplaints;

  const sortedDisplayed = useMemo(() => sortComplaints(displayed, sortBy), [displayed, sortBy]);

  const firstName = currentUser?.name?.split(/\s+/)[0] || 'there';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:h-full md:overflow-hidden">
      <div className="shrink-0 border-b border-amber-500/15 bg-gradient-to-br from-slate-950/90 via-violet-950/25 to-amber-950/30 px-4 py-6 backdrop-blur sm:px-8 sm:py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:max-w-none">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 flex items-center gap-2 text-xs font-medium tracking-wide text-amber-200/75">
                <Headphones className="h-3.5 w-3.5 text-amber-400/90" />
                Support queue
              </p>
              <h1 className="text-2xl text-white sm:text-3xl" style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                Hey, {firstName}
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/55">
                Cases assigned to you live here. Open one to message the customer and update the thread.
              </p>
              {currentUser?.specialization && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {currentUser.specialization.split(',').map(spec => (
                    <span
                      key={spec.trim()}
                      className="rounded-full border border-violet-400/35 bg-violet-500/15 px-2.5 py-1 text-xs text-violet-100"
                    >
                      {spec.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <BorderGlow
              glowColor="270 55 55"
              backgroundColor="rgba(45, 25, 60, 0.5)"
              borderRadius={14}
              fillOpacity={0.1}
              className="shrink-0 self-start"
            >
              <button
                type="button"
                onClick={() => navigate('/staff/history')}
                className="flex cursor-target items-center gap-2 px-5 py-3 text-sm text-violet-100 transition-colors hover:bg-white/10"
                style={{ fontWeight: 600 }}
              >
                <History className="h-4 w-4" />
                Resolution history
              </button>
            </BorderGlow>
          </div>

          {/* Same five metrics + tab switching as before; layout tuned for staff workbench */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-3">
            {statsCards.map(card => {
              const Icon = card.icon;
              const isActive = activeTab === card.filterKey;
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => setActiveTab(card.filterKey)}
                  className={cn(
                    'rounded-2xl border px-3 py-3 text-left transition-all cursor-target sm:px-4 sm:py-4',
                    isActive
                      ? 'border-amber-400/45 bg-amber-500/15 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.25)]'
                      : 'border-white/[0.08] bg-black/20 hover:border-amber-500/25 hover:bg-white/[0.04]'
                  )}
                >
                  <div
                    className={cn(
                      'mb-2 flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9',
                      isActive ? 'bg-amber-500/25 text-amber-200' : 'bg-white/[0.08] text-white/50'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <p className="text-xl text-white sm:text-2xl" style={{ fontWeight: 700 }}>
                    {card.value}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/50 sm:text-xs">{card.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-8 sm:py-8 md:min-h-0 md:flex-1 md:overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-6 lg:max-w-none">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader className="mb-4 h-8 w-8 animate-spin text-amber-400/50" />
              <p className="text-sm text-white/50">Loading your assignments…</p>
            </div>
          ) : (
            <>
              {active.length > 0 && activeTab === 'active' && (
                <div className="flex items-start gap-3 rounded-2xl border border-violet-500/25 bg-violet-950/30 px-4 py-3.5 backdrop-blur">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/20">
                    <MessageSquare className="h-4 w-4 text-violet-200" />
                  </div>
                  <p className="text-sm leading-relaxed text-violet-100/90">
                    <span className="text-white" style={{ fontWeight: 600 }}>
                      {active.length} active case{active.length > 1 ? 's' : ''}
                    </span>{' '}
                    — check threads for new messages from customers.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-white" style={{ fontWeight: 600 }}>
                    {activeTab === 'active'
                      ? 'Active cases'
                      : activeTab === 'resolved'
                        ? 'Resolved cases'
                        : 'Cancelled cases'}
                  </h2>
                  <p className="mt-0.5 text-xs text-white/40">
                    {sortedDisplayed.length} case{sortedDisplayed.length !== 1 ? 's' : ''} in this view
                  </p>
                </div>
                <ComplaintSortSelect
                  id="staff-complaint-sort"
                  variant="staff"
                  value={sortBy}
                  onChange={setSortBy}
                  className="sm:max-w-full"
                />
              </div>

              {sortedDisplayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-500/15 bg-slate-950/35 py-20 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-950/40">
                    {activeTab === 'active' ? (
                      <MessageSquare className="h-6 w-6 text-violet-400/50" />
                    ) : activeTab === 'cancelled' ? (
                      <XCircle className="h-6 w-6 text-white/35" />
                    ) : (
                      <CheckCircle2 className="h-6 w-6 text-amber-400/45" />
                    )}
                  </div>
                  <p className="mb-1 text-sm text-white/70" style={{ fontWeight: 600 }}>
                    Nothing to show
                  </p>
                  <p className="max-w-xs text-sm text-white/45">
                    {activeTab === 'active'
                      ? 'No active cases assigned to you right now.'
                      : activeTab === 'cancelled'
                        ? 'No cancelled cases yet.'
                        : 'No resolved cases yet.'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {sortedDisplayed.map((complaint, index) => (
                    <li key={complaint.id}>
                      <ComplaintCard
                        complaint={complaint}
                        variant="staff"
                        showUser
                        unreadMessageCount={unreadCounts[complaint.complaintId ?? Number(complaint.id)] ?? 0}
                        playIntroGlow={index === 0}
                        onClick={() => navigate(`/staff/complaint/${complaint.id}`)}
                      />
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
