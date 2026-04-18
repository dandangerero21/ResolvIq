import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import userService, { User } from '../../../services/userService';
import complaintService from '../../../services/complaintService';
import staffApplicationService, {
  StaffApplicationView,
  notifyPendingStaffApplicationsUpdated,
} from '../../../services/staffApplicationService';
import { Complaint } from '../../types';
import { ComplaintSortSelect } from '../shared/ComplaintSortSelect';
import { complaintCategoryLabel } from '../../utils/complaintCategoryLabel';
import { sortComplaints, type ComplaintSortKey } from '../../utils/complaintSort';
import {
  ArrowLeft,
  Mail,
  Star,
  CheckCircle2,
  Clock,
  Zap,
  Loader,
  UserPlus,
  XCircle,
  ArrowRightLeft,
  ClipboardList,
  Calendar,
} from 'lucide-react';

type StaffModalFilter = 'all' | 'inprogress' | 'resolved' | 'cancelled' | 'transferred';

const isResolvedComplaint = (complaint: Complaint): boolean =>
  complaint.status === 'resolved' || complaint.status === 'Resolved';

const isCancelledComplaint = (complaint: Complaint): boolean =>
  complaint.status === 'cancelled' || complaint.status === 'Cancelled';

const getPriorityBadgeClass = (priority: Complaint['priority']): string => {
  switch (priority) {
    case 'Critical':
      return 'bg-red-600/35 text-red-100 border border-red-500/40';
    case 'High':
      return 'bg-orange-500/20 text-orange-200 border border-orange-500/35';
    case 'Medium':
      return 'bg-amber-500/20 text-amber-200 border border-amber-500/35';
    case 'Low':
      return 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/35';
    default:
      return 'bg-white/10 text-white/65 border border-white/20';
  }
};

const getStatusBadgeMeta = (complaint: Complaint): { label: string; className: string } => {
  if (isCancelledComplaint(complaint)) {
    return { label: 'Cancelled', className: 'bg-red-500/20 text-red-200 border border-red-500/35' };
  }
  if (isResolvedComplaint(complaint)) {
    return { label: 'Completed', className: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/35' };
  }
  if (complaint.assignedStaffId) {
    return { label: 'In Progress', className: 'bg-amber-500/20 text-amber-200 border border-amber-500/35' };
  }
  return { label: 'Unassigned', className: 'bg-sky-500/20 text-sky-200 border border-sky-500/35' };
};

export function StaffDirectory() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [staffApplications, setStaffApplications] = useState<StaffApplicationView[]>([]);
  const [staffAppsLoading, setStaffAppsLoading] = useState(false);
  const [staffActionId, setStaffActionId] = useState<number | null>(null);

  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffModalFilter, setStaffModalFilter] = useState<StaffModalFilter>('all');
  const [staffModalSort, setStaffModalSort] = useState<ComplaintSortKey>('newest');

  const refreshStaffApplications = useCallback(async () => {
    if (currentUser?.role !== 'admin') {
      setStaffApplications([]);
      notifyPendingStaffApplicationsUpdated(0);
      return;
    }

    setStaffAppsLoading(true);
    try {
      const list = await staffApplicationService.getPending();
      setStaffApplications(list);
      notifyPendingStaffApplicationsUpdated(list.length);
    } catch (error) {
      console.error('Failed to load staff applications:', error);
      setStaffApplications([]);
      notifyPendingStaffApplicationsUpdated(0);
    } finally {
      setStaffAppsLoading(false);
    }
  }, [currentUser?.role]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [staff, complaintsList] = await Promise.all([
          userService.getStaffMembers(),
          complaintService.getAllComplaints(),
        ]);
        setStaffMembers(staff);
        setComplaints(complaintsList);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    void refreshStaffApplications();
  }, [refreshStaffApplications]);

  const getStaffComplaints = useCallback(
    (staffId: number): Complaint[] =>
      complaints.filter(complaint => {
        const complaintStaffId = Number(complaint.assignedStaffId);
        return Number.isFinite(complaintStaffId) && complaintStaffId === staffId;
      }),
    [complaints]
  );

  const getStaffStats = useCallback(
    (staffId: number) => {
      const staffComplaints = getStaffComplaints(staffId);
      const active = staffComplaints.filter(c => !isResolvedComplaint(c) && !isCancelledComplaint(c)).length;
      const resolved = staffComplaints.filter(isResolvedComplaint);
      const cancelled = staffComplaints.filter(isCancelledComplaint).length;
      const transferred = complaints.filter(c => Number(c.transferredByStaffId) === staffId).length;
      const rated = resolved.filter(c => c.rating);
      const avgRating =
        rated.length > 0
          ? (rated.reduce((s, c) => s + (c.rating ?? 0), 0) / rated.length).toFixed(1)
          : null;
      return {
        total: staffComplaints.length,
        active,
        resolved: resolved.length,
        cancelled,
        transferred,
        avgRating,
      };
    },
    [getStaffComplaints, complaints]
  );

  const selectedStaffStats = useMemo(() => {
    if (!selectedStaff?.userId) {
      return {
        total: 0,
        active: 0,
        resolved: 0,
        cancelled: 0,
        transferred: 0,
        avgRating: null as string | null,
      };
    }
    return getStaffStats(Number(selectedStaff.userId));
  }, [selectedStaff, getStaffStats]);

  const selectedStaffComplaints = useMemo(() => {
    if (!selectedStaff?.userId) return [];
    return getStaffComplaints(Number(selectedStaff.userId));
  }, [selectedStaff, getStaffComplaints]);

  const selectedTransferredComplaints = useMemo(() => {
    if (!selectedStaff?.userId) return [];
    const selectedStaffId = Number(selectedStaff.userId);
    return complaints.filter(complaint => Number(complaint.transferredByStaffId) === selectedStaffId);
  }, [selectedStaff, complaints]);

  const filteredStaffComplaints = useMemo(() => {
    if (staffModalFilter === 'inprogress') {
      return selectedStaffComplaints.filter(c => !isResolvedComplaint(c) && !isCancelledComplaint(c));
    }
    if (staffModalFilter === 'resolved') {
      return selectedStaffComplaints.filter(isResolvedComplaint);
    }
    if (staffModalFilter === 'cancelled') {
      return selectedStaffComplaints.filter(isCancelledComplaint);
    }
    if (staffModalFilter === 'transferred') {
      return selectedTransferredComplaints;
    }
    return selectedStaffComplaints;
  }, [selectedStaffComplaints, selectedTransferredComplaints, staffModalFilter]);

  const sortedStaffComplaints = useMemo(
    () => sortComplaints(filteredStaffComplaints, staffModalSort),
    [filteredStaffComplaints, staffModalSort]
  );

  const openStaffModal = (staff: User) => {
    setSelectedStaff(staff);
    setStaffModalFilter('all');
    setStaffModalSort('newest');
    setIsStaffModalOpen(true);
  };

  const closeStaffModal = () => {
    setIsStaffModalOpen(false);
    setSelectedStaff(null);
  };

  useEffect(() => {
    if (!isStaffModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeStaffModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isStaffModalOpen]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:h-full md:overflow-hidden">
      <div className="shrink-0 border-b border-white/10 bg-white/5 backdrop-blur px-4 py-5 sm:px-8 sm:py-6">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="mb-4 flex cursor-target items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <p className="mb-1 text-xs uppercase tracking-wider text-white/60">Admin Panel</p>
        <h1 className="text-white" style={{ fontWeight: 700 }}>Staff Directory</h1>
        <p className="mt-0.5 text-sm text-white/60">
          {staffMembers.length} staff members
          {staffApplications.length > 0
            ? ` • ${staffApplications.length} pending application${staffApplications.length > 1 ? 's' : ''}`
            : ''}
        </p>
      </div>

      <div className="px-4 py-5 sm:px-8 sm:py-6 md:min-h-0 md:flex-1 md:overflow-y-auto">
        {currentUser?.role === 'admin' && (
          <div className="mb-8 rounded-2xl border border-white/15 bg-white/5 p-4 sm:p-5">
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
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
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
                          } catch (error) {
                            console.error(error);
                            alert(error instanceof Error ? error.message : 'Approve failed');
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
                          } catch (error) {
                            console.error(error);
                            alert(error instanceof Error ? error.message : 'Reject failed');
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

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="mb-3 h-6 w-6 animate-spin text-white/60" />
            <p className="text-sm text-white/60">Loading staff members...</p>
          </div>
        ) : staffMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <Zap className="h-6 w-6 text-white/30" />
            </div>
            <p className="text-sm text-white/60">No staff members yet</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {staffMembers.map(staff => {
              const staffId = Number(staff.userId);
              const stats = Number.isFinite(staffId)
                ? getStaffStats(staffId)
                : { total: 0, active: 0, resolved: 0, cancelled: 0, avgRating: null as string | null };

              return (
                <button
                  key={staff.userId ?? staff.email}
                  type="button"
                  onClick={() => Number.isFinite(staffId) && openStaffModal(staff)}
                  className="cursor-target overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-left backdrop-blur transition-all hover:bg-white/20"
                >
                  <div className="flex items-center gap-3 bg-black px-5 py-4">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
                      style={{ fontWeight: 700, fontSize: '14px' }}
                    >
                      {staff.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white" style={{ fontWeight: 600 }}>{staff.name}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-white/40" />
                        <p className="truncate text-xs text-white/40">{staff.email}</p>
                      </div>
                    </div>
                    {stats.avgRating && (
                      <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5">
                        <Star className="h-3 w-3 fill-white text-white" />
                        <span className="text-xs text-white" style={{ fontWeight: 700 }}>{stats.avgRating}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-5 divide-x divide-white/10 border-b border-white/10">
                    <div className="flex flex-col items-center px-2 py-3">
                      <Zap className="mb-1 h-3 w-3 text-white/60" />
                      <p className="text-white" style={{ fontWeight: 700 }}>{stats.total}</p>
                      <p className="text-xs text-white/60">Total</p>
                    </div>
                    <div className="flex flex-col items-center px-2 py-3">
                      <Clock className="mb-1 h-3 w-3 text-amber-400" />
                      <p className="text-amber-300" style={{ fontWeight: 700 }}>{stats.active}</p>
                      <p className="text-xs text-white/60">Active</p>
                    </div>
                    <div className="flex flex-col items-center px-2 py-3">
                      <CheckCircle2 className="mb-1 h-3 w-3 text-emerald-400" />
                      <p className="text-emerald-300" style={{ fontWeight: 700 }}>{stats.resolved}</p>
                      <p className="text-xs text-white/60">Completed</p>
                    </div>
                    <div className="flex flex-col items-center px-2 py-3">
                      <XCircle className="mb-1 h-3 w-3 text-red-400" />
                      <p className="text-red-300" style={{ fontWeight: 700 }}>{stats.cancelled}</p>
                      <p className="text-xs text-white/60">Cancelled</p>
                    </div>
                    <div className="flex flex-col items-center px-2 py-3">
                      <ArrowRightLeft className="mb-1 h-3 w-3 text-violet-300" />
                      <p className="text-violet-200" style={{ fontWeight: 700 }}>{stats.transferred}</p>
                      <p className="text-xs text-white/60">Transferred</p>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="mb-2.5 text-xs uppercase tracking-wider text-white/60">Specializations</p>
                    <div className="flex flex-wrap gap-1.5">
                      {staff.specialization?.split(',').map(spec => (
                        <span
                          key={spec.trim()}
                          className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2.5 py-1 text-xs text-amber-300"
                        >
                          {spec.trim()}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-white/45">Click for full profile and handled complaints</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isStaffModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={closeStaffModal}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close staff detail modal"
          />

          <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-black/90">
            <div className="border-b border-white/10 bg-white/5 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white" style={{ fontWeight: 700 }}>
                    {selectedStaff.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-white/55">Staff profile</p>
                    <h3 className="truncate text-white" style={{ fontWeight: 700 }}>{selectedStaff.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/60">
                      <Mail className="h-3 w-3" />
                      {selectedStaff.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedStaff.specialization?.split(',').map(spec => (
                        <span
                          key={spec.trim()}
                          className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2.5 py-1 text-xs text-amber-200"
                        >
                          {spec.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeStaffModal}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5 sm:p-6">
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-6">
                <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/45">Total</p>
                  <p className="mt-1 text-lg text-white" style={{ fontWeight: 700 }}>{selectedStaffStats.total}</p>
                </div>
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-amber-200/70">Active</p>
                  <p className="mt-1 text-lg text-amber-200" style={{ fontWeight: 700 }}>{selectedStaffStats.active}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-200/70">Completed</p>
                  <p className="mt-1 text-lg text-emerald-200" style={{ fontWeight: 700 }}>{selectedStaffStats.resolved}</p>
                </div>
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-red-200/70">Cancelled</p>
                  <p className="mt-1 text-lg text-red-200" style={{ fontWeight: 700 }}>{selectedStaffStats.cancelled}</p>
                </div>
                <div className="rounded-xl border border-violet-500/25 bg-violet-500/10 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-violet-200/75">Transferred</p>
                  <p className="mt-1 text-lg text-violet-100" style={{ fontWeight: 700 }}>{selectedStaffStats.transferred}</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/45">Avg. Rating</p>
                  <p className="mt-1 text-lg text-white" style={{ fontWeight: 700 }}>
                    {selectedStaffStats.avgRating ?? '—'}
                  </p>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                {([
                  { key: 'all', label: 'All' },
                  { key: 'inprogress', label: 'In Progress' },
                  { key: 'resolved', label: 'Completed' },
                  { key: 'cancelled', label: 'Cancelled' },
                  { key: 'transferred', label: 'Transferred' },
                ] as const).map(option => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setStaffModalFilter(option.key)}
                    className={`cursor-target rounded-full border px-3 py-1.5 text-xs transition-all ${
                      staffModalFilter === option.key
                        ? 'border-red-500/45 bg-red-500/15 text-red-200'
                        : 'border-white/20 bg-white/5 text-white/65 hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}

                <div className="ml-auto w-full sm:w-auto">
                  <ComplaintSortSelect
                    id="staff-directory-modal-sort"
                    variant="admin"
                    value={staffModalSort}
                    onChange={setStaffModalSort}
                  />
                </div>
              </div>

              {sortedStaffComplaints.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 py-14 text-center">
                  <ClipboardList className="mx-auto mb-3 h-6 w-6 text-white/35" />
                  <p className="text-sm text-white/65">No handled complaints in this filter.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {sortedStaffComplaints.map(complaint => {
                    const statusMeta = getStatusBadgeMeta(complaint);
                    const hasRating = typeof complaint.rating === 'number' && complaint.rating > 0;
                    const ratingFeedback = complaint.ratingFeedback?.trim();
                    return (
                      <li key={complaint.id} className="rounded-xl border border-white/15 bg-white/5 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-white" style={{ fontWeight: 600 }}>
                              {complaint.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/60">
                              {complaint.description}
                            </p>
                          </div>
                          <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
                          <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-white/70">
                            {complaintCategoryLabel(complaint)}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 ${getPriorityBadgeClass(complaint.priority)}`}>
                            {complaint.priority ?? 'Medium'}
                          </span>
                          {selectedStaff?.userId && Number(complaint.transferredByStaffId) === Number(selectedStaff.userId) && (
                            <span className="rounded-full border border-violet-500/35 bg-violet-500/20 px-2 py-0.5 text-violet-200">
                              Transferred by this staff
                            </span>
                          )}
                          <span>By {complaint.createdByName || complaint.userName || 'Unknown'}</span>
                          <span className="text-white/30">•</span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {complaint.createdAt
                              ? new Date(complaint.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'N/A'}
                          </span>
                        </div>

                        {hasRating && (
                          <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-200">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span style={{ fontWeight: 700 }}>{complaint.rating}/5</span>
                              <span className="text-amber-200/70">customer rating</span>
                            </div>
                            {ratingFeedback && (
                              <p className="mt-1.5 text-xs leading-relaxed text-amber-100/90">
                                "{ratingFeedback}"
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}