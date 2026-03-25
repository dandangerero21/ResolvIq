import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ComplaintCard } from '../shared/ComplaintCard';
import BorderGlow from '../../../components/BorderGlow';
import complaintService from '../../../services/complaintService';
import { Complaint } from '../../types';
import {
  Plus,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../ui/utils';

type TabKey = 'all' | 'open' | 'inprogress' | 'resolved';

const tabs: { key: TabKey; label: string; short: string }[] = [
  { key: 'all', label: 'All', short: 'All' },
  { key: 'open', label: 'Pending', short: 'Pending' },
  { key: 'inprogress', label: 'In progress', short: 'Active' },
  { key: 'resolved', label: 'Resolved', short: 'Done' },
];

export function UserDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { complaints: contextComplaints } = useApp();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  useEffect(() => {
    if (!currentUser?.userId) return;

    const loadComplaints = async () => {
      try {
        const backendComplaints = await complaintService.getUserComplaints(currentUser.userId!);
        setComplaints(backendComplaints);
      } catch (error) {
        console.error('Failed to load complaints:', error);
        setComplaints(contextComplaints);
      }
    };

    loadComplaints();
  }, [currentUser?.userId]);

  const userComplaints = complaints.length > 0 ? complaints : contextComplaints.filter(c =>
    (c.createdById === currentUser?.userId ||
      c.createdById?.toString() === currentUser?.id ||
      c.userId === currentUser?.id) &&
    c.status !== 'Cancelled' &&
    c.status !== 'cancelled'
  );
  const openComplaints = userComplaints.filter(c => c.status === 'open' || c.status === 'Open');
  const inProgressComplaints = userComplaints.filter(c => c.status === 'assigned' || c.status === 'In Progress');
  const resolvedComplaints = userComplaints.filter(c => c.status === 'resolved' || c.status === 'Resolved');

  const filteredComplaints =
    activeTab === 'all'
      ? userComplaints
      : activeTab === 'open'
        ? openComplaints
        : activeTab === 'inprogress'
          ? inProgressComplaints
          : resolvedComplaints;

  const tabCounts: Record<TabKey, number> = {
    all: userComplaints.length,
    open: openComplaints.length,
    inprogress: inProgressComplaints.length,
    resolved: resolvedComplaints.length,
  };

  const firstName = currentUser?.name?.split(/\s+/)[0] || 'there';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Personal header — distinct from admin “panel” chrome */}
      <div className="flex-shrink-0 border-b border-teal-500/10 bg-gradient-to-br from-slate-950/80 via-slate-950/40 to-teal-950/20 px-6 py-8 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 lg:max-w-none">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="mb-1.5 flex items-center gap-2 text-xs font-medium tracking-wide text-teal-200/70">
                <Sparkles className="h-3.5 w-3.5 text-teal-400/90" />
                Your activity
              </p>
              <h1 className="text-2xl text-white sm:text-3xl" style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                Hi, {firstName}
              </h1>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-white/55">
                Track the requests you’ve sent us. We’ll keep you updated as the team works on them.
              </p>
            </div>
            <BorderGlow
              glowColor="170 60 45"
              backgroundColor="rgba(6, 40, 38, 0.55)"
              borderRadius={14}
              fillOpacity={0.12}
              className="shrink-0 self-start sm:self-auto"
            >
              <button
                type="button"
                onClick={() => navigate('/user/submit')}
                className="flex cursor-target items-center gap-2 px-5 py-3 text-sm text-teal-50 transition-colors hover:bg-white/10"
                style={{ fontWeight: 600 }}
              >
                <Plus className="h-4 w-4" />
                New request
              </button>
            </BorderGlow>
          </div>

          {/* Segmented filter — not the same 4-up KPI grid as admin */}
          <div
            className="flex flex-wrap gap-2 rounded-2xl border border-white/[0.08] bg-black/25 p-1.5"
            role="tablist"
            aria-label="Filter complaints"
          >
            {tabs.map(tab => {
              const active = activeTab === tab.key;
              const count = tabCounts[tab.key];
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex min-h-[2.5rem] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs transition-all sm:flex-none sm:px-4 sm:text-sm',
                    active
                      ? 'bg-teal-500/20 text-teal-100 shadow-[inset_0_0_0_1px_rgba(45,212,191,0.35)]'
                      : 'text-white/45 hover:bg-white/[0.06] hover:text-white/75'
                  )}
                  style={{ fontWeight: active ? 600 : 500 }}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.short}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums sm:text-xs',
                      active ? 'bg-teal-950/50 text-teal-200' : 'bg-white/[0.06] text-white/40'
                    )}
                    style={{ fontWeight: 700 }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6 lg:max-w-none">
          {inProgressComplaints.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-teal-500/20 bg-teal-950/25 px-4 py-3.5 backdrop-blur">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/20">
                <Clock className="h-4 w-4 text-teal-300" />
              </div>
              <p className="text-sm leading-relaxed text-teal-100/90">
                <span className="text-teal-50" style={{ fontWeight: 600 }}>
                  {inProgressComplaints.length} request{inProgressComplaints.length > 1 ? 's are' : ' is'} being handled
                </span>{' '}
                by our team. You’ll see updates here and can open any item for the full thread.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div>
              <h2 className="text-white" style={{ fontWeight: 600 }}>
                Your requests
              </h2>
              <p className="mt-0.5 text-xs text-white/40">
                {filteredComplaints.length === userComplaints.length
                  ? `${userComplaints.length} total`
                  : `Showing ${filteredComplaints.length} of ${userComplaints.length}`}
              </p>
            </div>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/30 py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-500/20 bg-teal-950/30">
                <ClipboardList className="h-6 w-6 text-teal-400/50" />
              </div>
              <p className="mb-1 text-sm text-white/70" style={{ fontWeight: 600 }}>
                Nothing here yet
              </p>
              <p className="mb-6 max-w-xs text-sm text-white/45">
                {activeTab === 'all'
                  ? 'When you submit a request, it will show up in this list.'
                  : 'Try another filter, or check back later.'}
              </p>
              {activeTab === 'all' && (
                <BorderGlow
                  glowColor="170 60 45"
                  backgroundColor="rgba(6, 40, 38, 0.5)"
                  borderRadius={14}
                  fillOpacity={0.1}
                >
                  <button
                    type="button"
                    onClick={() => navigate('/user/submit')}
                    className="flex cursor-target items-center gap-2 px-5 py-2.5 text-sm text-teal-50 transition-colors hover:bg-white/10"
                    style={{ fontWeight: 600 }}
                  >
                    <Plus className="h-4 w-4" />
                    Submit a request
                  </button>
                </BorderGlow>
              )}
            </div>
          ) : (
            <ul className="space-y-4">
              {filteredComplaints.map((complaint, index) => (
                <li key={complaint.id}>
                  <ComplaintCard
                    complaint={complaint}
                    variant="user"
                    playIntroGlow={index === 0}
                    onClick={() => navigate(`/user/complaint/${complaint.id}`)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
