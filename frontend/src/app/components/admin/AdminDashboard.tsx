import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ComplaintCard } from '../shared/ComplaintCard';
import { ComplaintSortSelect } from '../shared/ComplaintSortSelect';
import BorderGlow from '../../../components/BorderGlow';
import complaintService from '../../../services/complaintService';
import staffApplicationService, { StaffApplicationView } from '../../../services/staffApplicationService';
import { Complaint } from '../../types';
import { sortComplaints, partitionActiveAndResolved, type ComplaintSortKey } from '../../utils/complaintSort';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Users,
  Loader,
  UserPlus,
  XCircle,
} from 'lucide-react';

type FilterKey = 'all' | 'open' | 'inprogress' | 'resolved';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { complaints: contextComplaints } = useApp();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortBy, setSortBy] = useState<ComplaintSortKey>('newest');
  const [staffApplications, setStaffApplications] = useState<StaffApplicationView[]>([]);
  const [staffAppsLoading, setStaffAppsLoading] = useState(false);
  const [staffActionId, setStaffActionId] = useState<number | null>(null);

  const refreshStaffApplications = useCallback(async () => {
    if (currentUser?.role !== 'admin') {
      setStaffApplications([]);
      return;
    }
    setStaffAppsLoading(true);
    try {
      const list = await staffApplicationService.getPending();
      setStaffApplications(list);
    } catch (e) {
      console.error('Failed to load staff applications', e);
      setStaffApplications([]);
    } finally {
      setStaffAppsLoading(false);
    }
  }, [currentUser?.role]);

  useEffect(() => {
    void refreshStaffApplications();
  }, [refreshStaffApplications]);

  useEffect(() => {
    const loadComplaints = async () => {
      try {
        const data = await complaintService.getAllComplaints();
        setComplaints(data);
      } catch (error) {
        console.error('Failed to load complaints:', error);
        // Fall back to context complaints if backend fails
        setComplaints(contextComplaints);
      } finally {
        setIsLoading(false);
      }
    };
    loadComplaints();
  }, []);

  const displayComplaints = complaints.length > 0 ? complaints : contextComplaints;
  const total = displayComplaints.filter(c => c.status !== 'Cancelled' && c.status !== 'cancelled').length;
  const open = displayComplaints.filter(c => c.status === 'open' || c.status === 'Open');
  const inProgress = displayComplaints.filter(c => c.status === 'assigned' || c.status === 'In Progress');
  const resolved = displayComplaints.filter(c => c.status === 'resolved' || c.status === 'Resolved');
  const unassigned = displayComplaints.filter(c => !c.assignedStaffId && c.status !== 'Cancelled' && c.status !== 'cancelled');

  const filteredComplaints =
    filter === 'open' ? open :
    filter === 'inprogress' ? inProgress :
    filter === 'resolved' ? resolved :
    displayComplaints;

  const sortedComplaints = useMemo(
    () => sortComplaints(filteredComplaints, sortBy),
    [filteredComplaints, sortBy]
  );

  const { active: activeSorted, resolved: resolvedSorted } = useMemo(
    () => partitionActiveAndResolved(sortedComplaints),
    [sortedComplaints]
  );

  /** Resolved pinned to bottom only when "All" shows both active and resolved rows. */
  const showResolvedSection =
    filter === 'all' && activeSorted.length > 0 && resolvedSorted.length > 0;

  const resolutionRate = total > 0 ? Math.round((resolved.length / total) * 100) : 0;

  const statsCards = [
    {
      label: 'Total Complaints',
      value: total,
      icon: ClipboardList,
      color: 'text-white',
      bg: 'bg-white/10',
      border: 'border-l-white/20',
      key: 'all' as FilterKey,
    },
    {
      label: 'Pending',
      value: open.length,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-l-red-400',
      key: 'open' as FilterKey,
    },
    {
      label: 'In Progress',
      value: inProgress.length,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-l-amber-400',
      key: 'inprogress' as FilterKey,
    },
    {
      label: 'Resolved',
      value: resolved.length,
      icon: CheckCircle2,
      color: 'text-white/60',
      bg: 'bg-white/10',
      border: 'border-l-white/20',
      key: 'resolved' as FilterKey,
    },
  ];

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto md:h-full md:overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 bg-white/5 px-4 py-5 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs uppercase tracking-wider text-white/60">Admin Panel</p>
            <h1 className="text-white" style={{ fontWeight: 700 }}>
              Overview Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-white/60">
              Welcome,{' '}
              <span className="text-white" style={{ fontWeight: 500 }}>
                {currentUser?.name}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <BorderGlow
              glowColor="0 100 50"
              backgroundColor="rgba(78, 15, 15, 0.6)"
              borderRadius={12}
              fillOpacity={0.1}
            >
              <button
                onClick={() => navigate('/admin/assign')}
                className="flex cursor-target items-center gap-2 px-4 py-2.5 text-sm text-white transition-colors hover:bg-white/10"
                style={{ fontWeight: 600 }}
              >
                <UserCheck className="h-4 w-4 shrink-0" />
                Assign Complaints
                {unassigned.length > 0 && (
                  <span
                    className="rounded-full bg-white/30 px-1.5 py-0.5 text-xs text-white"
                    style={{ fontWeight: 700 }}
                  >
                    {unassigned.length}
                  </span>
                )}
              </button>
            </BorderGlow>
            <BorderGlow
              glowColor="200 100 70"
              backgroundColor="rgba(20, 20, 20, 0.8)"
              borderRadius={12}
              fillOpacity={0.1}
            >
              <button
                onClick={() => navigate('/admin/staff')}
                className="flex cursor-target items-center gap-2 px-4 py-2.5 text-sm text-white transition-colors hover:bg-white/10"
                style={{ fontWeight: 500 }}
              >
                <Users className="h-4 w-4 shrink-0" />
                Staff Directory
              </button>
            </BorderGlow>
          </div>
        </div>
      </div>

      <div className="min-w-0 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 md:min-h-0 md:flex-1 md:overflow-y-auto">
        {currentUser?.role === 'admin' && (
          <div className="mb-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-white" style={{ fontWeight: 600 }}>
                <UserPlus className="h-4 w-4 text-amber-400" />
                Pending staff applications
              </h3>
              {staffAppsLoading && <Loader className="h-4 w-4 animate-spin text-white/40" />}
            </div>
            {staffApplications.length === 0 && !staffAppsLoading ? (
              <p className="text-sm text-white/50">No pending staff applications.</p>
            ) : (
              <ul className="space-y-3">
                {staffApplications.map(app => (
                  <li
                    key={app.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white" style={{ fontWeight: 600 }}>
                        {app.name}
                      </p>
                      <p className="text-xs text-white/60">{app.email}</p>
                      <p className="mt-1 text-xs text-white/50">{app.specialization}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">
                        Submitted {new Date(app.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={staffActionId !== null}
                        onClick={async () => {
                          setStaffActionId(app.id);
                          try {
                            await staffApplicationService.approve(app.id, currentUser?.userId);
                            await refreshStaffApplications();
                          } catch (err) {
                            console.error(err);
                            alert(err instanceof Error ? err.message : 'Approve failed');
                          } finally {
                            setStaffActionId(null);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={staffActionId !== null}
                        onClick={async () => {
                          const note = window.prompt('Optional note to include in the rejection email (leave blank for none):') ?? '';
                          setStaffActionId(app.id);
                          try {
                            await staffApplicationService.reject(app.id, {
                              reviewerUserId: currentUser?.userId,
                              note: note || undefined,
                            });
                            await refreshStaffApplications();
                          } catch (err) {
                            console.error(err);
                            alert(err instanceof Error ? err.message : 'Reject failed');
                          } finally {
                            setStaffActionId(null);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-900/50 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Bento: stats row + tall resolution + wide assignment (lg+) */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsCards.map(card => {
            const Icon = card.icon;
            const isActive = filter === card.key;
            return (
              <BorderGlow
                key={card.label}
                className="min-w-0 lg:col-span-1 lg:row-start-1"
                backgroundColor="rgba(15, 10, 20, 0.8)"
                borderRadius={16}
                fillOpacity={0.1}
              >
                <button
                  onClick={() => setFilter(card.key)}
                  className={`w-full p-5 text-left transition-all cursor-target ${
                    isActive ? 'bg-red-600/30' : 'hover:bg-white/10'
                  }`}
                >
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <p className="text-2xl text-white" style={{ fontWeight: 700 }}>
                    {card.value}
                  </p>
                  <p className="mt-0.5 text-xs text-white/60">{card.label}</p>
                </button>
              </BorderGlow>
            );
          })}

          <BorderGlow
            className="min-w-0 sm:col-span-2 lg:col-span-1 lg:col-start-1 lg:row-span-2 lg:row-start-2 lg:min-h-[200px]"
            backgroundColor="rgba(15, 10, 20, 0.8)"
            borderRadius={16}
            fillOpacity={0.1}
          >
            <div className="flex h-full min-h-[180px] flex-col p-5 lg:min-h-[220px]">
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-white/50" />
                <p className="text-xs uppercase tracking-wider text-white/50">Resolution Rate</p>
              </div>
              <p className="mb-3 text-white" style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>
                {resolutionRate}%
              </p>
              <div className="h-1.5 w-full rounded-full bg-white/10">
                <div
                  className="h-1.5 rounded-full bg-red-500 transition-all"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
              <p className="mt-auto pt-3 text-xs text-white/30">
                {resolved.length} of {total} resolved
              </p>
            </div>
          </BorderGlow>

          {unassigned.length > 0 ? (
            <BorderGlow
              glowColor="0 100 50"
              backgroundColor="rgba(78, 15, 15, 0.6)"
              borderRadius={16}
              className="min-w-0 sm:col-span-2 lg:col-span-3 lg:col-start-2 lg:row-start-2"
              fillOpacity={0.05}
            >
              <div
                className="cursor-target cursor-pointer p-5 transition-colors hover:bg-white/10"
                onClick={() => navigate('/admin/assign')}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      <p className="text-xs uppercase tracking-wider text-red-400" style={{ fontWeight: 600 }}>
                        Action Required
                      </p>
                    </div>
                    <p className="text-white" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      {unassigned.length} complaint{unassigned.length > 1 ? 's' : ''} need assignment
                    </p>
                    <p className="mt-0.5 text-sm text-white/60">
                      Pending complaints are waiting for staff assignment
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-2 sm:flex-row">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600">
                      <UserCheck className="h-6 w-6 text-white" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-red-400" />
                  </div>
                </div>
              </div>
            </BorderGlow>
          ) : (
            <BorderGlow
              className="min-w-0 sm:col-span-2 lg:col-span-3 lg:col-start-2 lg:row-start-2"
              backgroundColor="rgba(15, 10, 20, 0.75)"
              borderRadius={16}
              fillOpacity={0.08}
            >
              <div className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/20">
                  <CheckCircle2 className="h-6 w-6 text-white/60" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white" style={{ fontWeight: 600 }}>
                    All complaints assigned
                  </p>
                  <p className="mt-0.5 text-xs text-white/60">
                    Every complaint has been assigned to a staff member
                  </p>
                </div>
              </div>
            </BorderGlow>
          )}
        </div>

        {/* Complaint list */}
        <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="min-w-0 truncate text-white" style={{ fontWeight: 600 }}>
            {filter === 'all'
              ? 'All Complaints'
              : filter === 'open'
                ? 'Pending Complaints'
                : filter === 'inprogress'
                  ? 'In Progress Complaints'
                  : 'Resolved Complaints'}
          </h3>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 sm:gap-4">
            <ComplaintSortSelect
              id="admin-complaint-sort"
              variant="admin"
              value={sortBy}
              onChange={setSortBy}
            />
            <div className="flex items-center gap-1.5 text-xs text-white/60">
              <TrendingUp className="h-3.5 w-3.5 shrink-0" />
              {sortedComplaints.length} complaint{sortedComplaints.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="mb-3 h-6 w-6 animate-spin text-white/40" />
            <p className="text-sm text-white/60">Loading complaints...</p>
          </div>
        ) : sortedComplaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <ClipboardList className="h-6 w-6 text-white/30" />
            </div>
            <p className="text-sm text-white/60">No complaints in this category</p>
          </div>
        ) : showResolvedSection ? (
          <div className="min-w-0 space-y-8">
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/45" style={{ fontWeight: 600 }}>
                Open &amp; in progress
              </p>
              {activeSorted.map((complaint, index) => (
                <ComplaintCard
                  key={complaint.id}
                  complaint={complaint}
                  showAssignment
                  showUser
                  playIntroGlow={index === 0}
                />
              ))}
            </div>
            <div className="space-y-3 border-t border-white/10 pt-6">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/45" style={{ fontWeight: 600 }}>
                Resolved
              </p>
              {resolvedSorted.map(complaint => (
                <ComplaintCard
                  key={complaint.id}
                  complaint={complaint}
                  showAssignment
                  showUser
                  playIntroGlow={false}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="min-w-0 space-y-3">
            {sortedComplaints.map((complaint, index) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                showAssignment
                showUser
                playIntroGlow={index === 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}