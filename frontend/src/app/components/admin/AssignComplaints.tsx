import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Complaint } from '../../types';
import userService, { User } from '../../../services/userService';
import complaintService from '../../../services/complaintService';
import assignmentService from '../../../services/assignmentService';
import {
  UserPlus,
  CheckCircle2,
  Star,
  RefreshCw,
  ChevronDown,
  Filter,
  ArrowLeft,
  Loader,
} from 'lucide-react';
import { cn } from '../ui/utils';
import { complaintCategoryLabel } from '../../utils/complaintCategoryLabel';
import { specializationMatchesComplaint } from '../../utils/specializationMatch';

const priorityConfig = {
  Low: { className: 'bg-emerald-500/20 text-emerald-200', border: 'border-l-emerald-400' },
  Medium: { className: 'bg-amber-500/20 text-amber-200', border: 'border-l-amber-400' },
  High: { className: 'bg-orange-500/20 text-orange-200', border: 'border-l-orange-400' },
  Critical: { className: 'bg-red-600 text-red-100', border: 'border-l-red-600' },
};

const isClosedStatus = (status?: string) => {
  const normalized = status?.toLowerCase();
  return normalized === 'resolved' || normalized === 'cancelled';
};

export function AssignComplaints() {
  const navigate = useNavigate();
  const { complaints: contextComplaints, assignComplaint } = useApp();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(true);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [assigned, setAssigned] = useState<Record<string, boolean>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const openDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openDropdown) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = openDropdownRef.current;
      if (el && !el.contains(e.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [openDropdown]);

  useEffect(() => {
    const loadComplaints = async () => {
      try {
        const data = await complaintService.getAllComplaints();
        setComplaints(data);
      } catch (error) {
        console.error('Failed to load complaints:', error);
        setComplaints(contextComplaints);
      } finally {
        setIsLoadingComplaints(false);
      }
    };
    loadComplaints();
  }, []);

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const staff = await userService.getStaffMembers();
        setStaffMembers(staff);
      } catch (error) {
        console.error('Failed to load staff members:', error);
      } finally {
        setIsLoadingStaff(false);
      }
    };
    loadStaff();
  }, []);

  const unassigned = complaints.filter(
    c =>
      !c.assignedStaffId &&
      c.complaintId &&
      !isClosedStatus(c.status) &&
      Boolean(c.createdById || c.createdByName || c.userName)
  );

  const filtered = filterPriority === 'all'
    ? unassigned
    : unassigned.filter(c => c.priority === filterPriority);

  const getMatchingStaff = (complaint: Complaint) =>
    staffMembers.filter(s => specializationMatchesComplaint(s.specialization, complaint));

  const handleSelect = (complaintId: number | undefined, staffId: number) => {
    if (!complaintId) return;
    setSelections(prev => ({ ...prev, [complaintId]: staffId }));
    setOpenDropdown(null);
  };

  const handleAssign = (complaintId: number | undefined) => {
    if (!complaintId) return;
    const staffId = selections[complaintId];
    if (!staffId) return;
    const staff = staffMembers.find(s => s.userId === staffId);
    if (staff) {
      // Call backend to persist the assignment
      assignmentService.assignComplaint(complaintId, staffId).then(() => {
        // Update local context
        assignComplaint(complaintId.toString(), staffId.toString(), staff.name);
        setAssigned(prev => ({ ...prev, [complaintId]: true }));
      }).catch(err => {
        console.error('Failed to assign complaint:', err);
        alert('Failed to assign complaint. Please try again.');
      });
    }
  };

  const handleAssignAll = () => {
    const assignmentPromises = Object.entries(selections).map(([complaintId, staffId]) => {
      if (!assigned[complaintId]) {
        return assignmentService.assignComplaint(Number(complaintId), Number(staffId))
          .then(() => {
            const staff = staffMembers.find(s => s.userId === staffId);
            if (staff) assignComplaint(complaintId, staffId.toString(), staff.name);
          })
          .catch(err => console.error(`Failed to assign complaint ${complaintId}:`, err));
      }
      return Promise.resolve();
    });

    Promise.all(assignmentPromises).then(() => {
      setAssigned(prev => {
        const next = { ...prev };
        Object.keys(selections).forEach(id => { next[id] = true; });
        return next;
      });
    }).catch(err => {
      console.error('Failed to assign some complaints:', err);
      alert('Failed to assign some complaints. Please try again.');
    });
  };

  const pendingAssignments = Object.keys(selections).filter(id => !assigned[id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:h-full md:overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 bg-white/5 backdrop-blur px-4 py-5 sm:px-8 sm:py-6">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-4 transition-colors cursor-target"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Admin Panel</p>
            <h1 className="text-white" style={{ fontWeight: 700 }}>Assign Complaints</h1>
            <p className="text-white/60 text-sm mt-0.5">
              {unassigned.length} complaint{unassigned.length !== 1 ? 's' : ''} awaiting assignment
            </p>
          </div>
          {pendingAssignments.length > 0 && (
            <button
              onClick={handleAssignAll}
              className="flex items-center gap-2 bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
              style={{ fontWeight: 600 }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm All ({pendingAssignments.length})
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-5 sm:px-8 sm:py-6 md:min-h-0 md:flex-1 md:overflow-y-auto">
        {/* Filter */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-3.5 h-3.5 text-white/40" />
          <span className="text-xs text-white/60 mr-1">Filter by priority:</span>
          {(['all', 'Critical', 'High', 'Medium', 'Low']).map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-all',
                filterPriority === p
                  ? 'bg-black text-white border-black'
                  : 'bg-white/10 backdrop-blur text-white/60 border-white/20 hover:border-white/40'
              )}
            >
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>

        {isLoadingComplaints || isLoadingStaff ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="w-8 h-8 animate-spin text-white/60 mb-4" />
            <p className="text-white/60 text-sm">Loading complaints and staff members...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-white/30" />
            </div>
            <p className="text-white/60 text-sm">
              {unassigned.length === 0 ? 'All complaints have been assigned!' : 'No complaints match the filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 pb-8">
            {filtered.map(complaint => {
              const priority = priorityConfig[complaint.priority || 'Medium'];
              const matchingStaff = getMatchingStaff(complaint);
              const selectedId = complaint.complaintId ? selections[complaint.complaintId] : undefined;
              const selectedStaff = staffMembers.find(s => s.userId === selectedId);
              const isAssigned = complaint.complaintId ? assigned[complaint.complaintId] : false;
              const isDropdownOpen = openDropdown === complaint.complaintId?.toString();

              return (
                <div
                  key={complaint.id}
                  className={cn(
                    'relative rounded-xl border border-l-4 bg-white/5 backdrop-blur transition-all',
                    priority.border,
                    isAssigned ? 'border-white/10 opacity-70' : 'border-white/10',
                    isDropdownOpen && 'z-50'
                  )}
                >
                  <div className="p-5">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Complaint Info */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-xs bg-white/10 border border-white/20 text-white/70 px-2 py-0.5 rounded-full">
                            {complaintCategoryLabel(complaint)}
                          </span>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full', priority.className)}>
                            {complaint.priority}
                          </span>
                          {(complaint.assignmentCount ?? 0) > 0 && !complaint.assignedStaffId && (
                            <span className="flex items-center gap-1 text-xs bg-violet-500/20 text-violet-200 border border-violet-400/35 px-2 py-0.5 rounded-full">
                              <RefreshCw className="w-3 h-3" />
                              Reassignment
                            </span>
                          )}
                          {isAssigned && (
                            <span className="flex items-center gap-1 text-xs bg-white/10 text-white/70 border border-white/20 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              Assigned
                            </span>
                          )}
                        </div>
                        <h3 className="text-white text-sm mb-1" style={{ fontWeight: 600 }}>{complaint.title}</h3>
                        <p className="text-white/60 text-xs leading-relaxed line-clamp-2">{complaint.description}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <span className="text-xs text-white/60">By {complaint.createdByName || complaint.userName || 'Unknown'}</span>
                          <span className="text-xs text-white/40">•</span>
                          <span className="text-xs text-white/60">
                            {complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Assignment Panel */}
                      <div className="flex flex-col justify-center">
                        <label className="flex items-center gap-1.5 text-xs text-white/60 mb-2" style={{ fontWeight: 500 }}>
                          <UserPlus className="w-3.5 h-3.5" />
                          Assign to staff member
                        </label>

                        {/* Custom Dropdown */}
                        <div
                          ref={isDropdownOpen ? openDropdownRef : undefined}
                          className="relative"
                        >
                          <button
                            type="button"
                            onClick={() => setOpenDropdown(isDropdownOpen ? null : complaint.complaintId?.toString() || null)}
                            disabled={isAssigned}
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-2.5 border rounded-xl text-sm text-left transition-all',
                              isAssigned ? 'bg-white/5 backdrop-blur border-white/10 text-white/40 cursor-not-allowed' :
                              selectedStaff ? 'border-white/40 bg-white/10 backdrop-blur text-white' :
                              'border-white/20 bg-white/10 backdrop-blur text-white/60 hover:border-white/40'
                            )}
                          >
                            <span>{selectedStaff ? selectedStaff.name : 'Select staff member'}</span>
                            <ChevronDown className={cn('w-4 h-4 transition-transform', isDropdownOpen && 'rotate-180')} />
                          </button>

                          {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 z-[60] mt-1 max-h-96 overflow-y-auto rounded-xl border border-white/20 bg-neutral-950/95 shadow-2xl backdrop-blur-md">
                              {isLoadingStaff || isLoadingComplaints ? (
                                <div className="flex items-center justify-center py-6 text-white/60">
                                  <Loader className="w-4 h-4 animate-spin mr-2" />
                                  Loading staff...
                                </div>
                              ) : matchingStaff.length > 0 ? (
                                <>
                                  <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 border-b border-amber-500/30">
                                    <Star className="w-3 h-3 text-amber-400" />
                                    <span className="text-xs text-amber-300" style={{ fontWeight: 500 }}>Recommended (matching specialization)</span>
                                  </div>
                                  {matchingStaff.map(staff => (
                                    <button
                                      type="button"
                                      key={staff.userId}
                                      onClick={() => handleSelect(complaint.complaintId, staff.userId)}
                                      className="w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-amber-500/10 transition-colors border-b border-white/10"
                                    >
                                      <div className="w-7 h-7 rounded-full bg-amber-500/30 flex items-center justify-center text-amber-300 flex-shrink-0" style={{ fontSize: '11px', fontWeight: 700 }}>
                                        {staff.name.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="text-sm text-white" style={{ fontWeight: 500 }}>{staff.name}</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {staff.specialization && staff.specialization.split(',').map(spec => (
                                            <span key={spec.trim()} className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                                              {spec.trim()}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                  {staffMembers.length > matchingStaff.length && (
                                    <div className="px-3 py-2 border-t border-white/10">
                                      <span className="text-xs text-white/40">Other staff</span>
                                    </div>
                                  )}
                                </>
                              ) : staffMembers.length > 0 ? (
                                <div className="px-3 py-2">
                                  <span className="text-xs text-white/40">No matching specialization</span>
                                </div>
                              ) : null}
                              {staffMembers.filter(s => !matchingStaff.includes(s)).map(staff => (
                                <button
                                  type="button"
                                  key={staff.userId}
                                  onClick={() => handleSelect(complaint.complaintId, staff.userId)}
                                  className="w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/10 last:border-0"
                                >
                                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 flex-shrink-0" style={{ fontSize: '11px', fontWeight: 700 }}>
                                    {staff.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-sm text-white" style={{ fontWeight: 500 }}>{staff.name}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {staff.specialization && staff.specialization.split(',').map(spec => (
                                        <span key={spec.trim()} className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded">
                                          {spec.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {selectedStaff && !isAssigned && (
                          <button
                            onClick={() => handleAssign(complaint.complaintId)}
                            className="mt-2.5 flex items-center justify-center gap-2 px-4 py-2 bg-black hover:bg-red-600 text-white rounded-xl text-sm transition-colors"
                            style={{ fontWeight: 500 }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirm Assignment
                          </button>
                        )}

                        {isAssigned && selectedStaff && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-white/60 bg-white/10 border border-white/20 rounded-xl px-3 py-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white/40" />
                            Assigned to <span className="text-white" style={{ fontWeight: 500 }}>{selectedStaff.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}